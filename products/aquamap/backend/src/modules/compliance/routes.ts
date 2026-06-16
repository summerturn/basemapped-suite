import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { knex } from '../../config/database.js';
import { authenticateHook } from '../auth/routes.js';

export async function complianceRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticateHook);

  // Service Line Inventory
  app.get('/service-lines', async (request) => {
    const { utilityId } = request.user as any;
    const { leadStatus, page = 1, limit = 50 } = request.query as any;
    let query = knex('compliance_service_lines').where({ utility_id: utilityId });
    if (leadStatus) query = query.where({ lead_status: leadStatus });
    const total = await query.clone().count('id as count').first();
    const rows = await query.orderBy('address').limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
    return { success: true, data: rows, meta: { total: Number(total?.count || 0), page: Number(page), limit: Number(limit) } };
  });

  app.get('/service-lines/stats', async (request) => {
    const { utilityId } = request.user as any;
    const stats = await knex('compliance_service_lines')
      .where({ utility_id: utilityId })
      .select('lead_status')
      .count('id as count')
      .groupBy('lead_status');
    const total = stats.reduce((sum, s) => sum + Number(s.count), 0);
    const known = stats.filter(s => s.lead_status !== 'lead_status_unknown').reduce((sum, s) => sum + Number(s.count), 0);
    return {
      success: true,
      data: {
        total,
        byStatus: stats,
        percentKnown: total > 0 ? Math.round((known / total) * 100) : 0,
      },
    };
  });

  app.post('/service-lines/bulk-update', async (request) => {
    const { utilityId } = request.user as any;
    const schema = z.object({
      ids: z.array(z.string().uuid()),
      leadStatus: z.enum(['lead', 'galvanized_requiring_replacement', 'non_lead', 'lead_status_unknown']),
      replacementDate: z.string().optional(),
    });
    const body = schema.parse(request.body);
    const update: any = { lead_status: body.leadStatus, updated_at: new Date() };
    if (body.replacementDate) update.replacement_date = body.replacementDate;
    await knex('compliance_service_lines').whereIn('id', body.ids).where({ utility_id: utilityId }).update(update);
    return { success: true, data: { updated: body.ids.length } };
  });

  // Samples
  app.get('/samples', async (request) => {
    const { utilityId } = request.user as any;
    const { from, to, exceeded } = request.query as any;
    let query = knex('compliance_samples').where({ utility_id: utilityId });
    if (from) query = query.where('sample_date', '>=', from);
    if (to) query = query.where('sample_date', '<=', to);
    if (exceeded === 'true') query = query.where({ action_level_exceeded: true });
    const rows = await query.orderBy('sample_date', 'desc');
    return { success: true, data: rows };
  });

  app.post('/samples', async (request) => {
    const { utilityId } = request.user as any;
    const schema = z.object({
      serviceLineId: z.string().uuid(),
      sampleDate: z.string(),
      leadResultPpb: z.number().optional(),
      copperResultPpm: z.number().optional(),
    });
    const body = schema.parse(request.body);
    const exceeded = (body.leadResultPpb || 0) > 15 || (body.copperResultPpm || 0) > 1.3;
    const [sample] = await knex('compliance_samples').insert({
      utility_id: utilityId,
      service_line_id: body.serviceLineId,
      sample_date: body.sampleDate,
      lead_result_ppb: body.leadResultPpb,
      copper_result_ppm: body.copperResultPpm,
      action_level_exceeded: exceeded,
    }).returning('*');
    return { success: true, data: sample };
  });

  app.get('/samples/percentile', async (request) => {
    const { utilityId } = request.user as any;
    const { from, to } = request.query as any;
    let query = knex('compliance_samples').where({ utility_id: utilityId });
    if (from) query = query.where('sample_date', '>=', from);
    if (to) query = query.where('sample_date', '<=', to);
    const rows = await query.select('lead_result_ppb', 'copper_result_ppm').orderBy('lead_result_ppb');
    const leadValues = rows.map(r => r.lead_result_ppb).filter(v => v !== null).sort((a, b) => a - b);
    const copperValues = rows.map(r => r.copper_result_ppm).filter(v => v !== null).sort((a, b) => a - b);
    const percentile90 = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const idx = Math.ceil(arr.length * 0.9) - 1;
      return arr[Math.max(0, idx)];
    };
    return {
      success: true,
      data: {
        lead90th: percentile90(leadValues),
        copper90th: percentile90(copperValues),
        sampleCount: rows.length,
        actionLevelExceeded: rows.filter(r => r.action_level_exceeded).length,
      },
    };
  });

  // Alerts
  app.get('/alerts', async (request) => {
    const { utilityId } = request.user as any;
    const alerts = [];
    const exceededSamples = await knex('compliance_samples')
      .where({ utility_id: utilityId, action_level_exceeded: true })
      .where('sample_date', '>=', knex.raw("NOW() - INTERVAL '90 days'"))
      .count('id as count').first();
    if (exceededSamples && Number(exceededSamples.count) > 0) {
      alerts.push({ type: 'action_level_exceeded', severity: 'critical', message: `${exceededSamples.count} sample(s) exceeded action level in last 90 days` });
    }
    const unknownHigh = await knex('compliance_service_lines')
      .where({ utility_id: utilityId, lead_status: 'lead_status_unknown' })
      .count('id as count').first();
    if (unknownHigh && Number(unknownHigh.count) > 5) {
      alerts.push({ type: 'unknown_lead_status_high', severity: 'warning', message: `${unknownHigh.count} service lines with unknown lead status` });
    }
    return { success: true, data: alerts };
  });

  // AMP
  app.get('/amp/criticality-matrix', async (request) => {
    const { utilityId } = request.user as any;
    const assets = await knex('assets')
      .where({ utility_id: utilityId })
      .whereNotNull('condition_rating')
      .select('id', 'asset_type_id', 'condition_rating', 'status');
    // Simplified: criticality = importance of asset type, condition = 6 - rating
    const matrix: Record<string, { criticality: number; condition: number; assets: any[] }> = {};
    for (const a of assets) {
      const key = `${a.asset_type_id}-${a.condition_rating}`;
      if (!matrix[key]) matrix[key] = { criticality: 3, condition: 6 - (a.condition_rating || 3), assets: [] };
      matrix[key].assets.push(a);
    }
    return { success: true, data: Object.values(matrix) };
  });
}
