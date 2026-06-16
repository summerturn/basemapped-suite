import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { knex } from '../../config/database.js';
import { authenticateHook } from '../auth/routes.js';

const inspectionSchema = z.object({
  assetId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  inspectionType: z.string().optional(),
  inspectorId: z.string().uuid().optional(),
  scheduledDate: z.string().optional(),
  results: z.record(z.any()).default({}),
  conditionRatingAfter: z.number().min(1).max(5).optional(),
  gpsLocation: z.any().optional(),
  photos: z.array(z.any()).default([]),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'failed', 'overdue']).default('scheduled'),
  notes: z.string().optional(),
});

export async function inspectionRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticateHook);

  app.get('/', async (request) => {
    const { utilityId } = request.user as any;
    const { status, inspector, asset } = request.query as any;
    let query = knex('inspections')
      .join('assets', 'inspections.asset_id', 'assets.id')
      .where('assets.utility_id', utilityId)
      .select('inspections.*', 'assets.external_id as asset_external_id');
    if (status) query = query.where('inspections.status', status);
    if (inspector) query = query.where('inspections.inspector_id', inspector);
    if (asset) query = query.where('inspections.asset_id', asset);
    const rows = await query.orderBy('scheduled_date', 'desc');
    return { success: true, data: rows };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const insp = await knex('inspections').where({ id }).first();
    if (!insp) return reply.status(404).send({ success: false, error: 'Not found' });
    return { success: true, data: insp };
  });

  app.post('/', async (request) => {
    const { userId } = request.user as any;
    const body = inspectionSchema.parse(request.body);
    const [insp] = await knex('inspections').insert({
      asset_id: body.assetId,
      template_id: body.templateId,
      inspection_type: body.inspectionType,
      inspector_id: body.inspectorId || userId,
      scheduled_date: body.scheduledDate,
      results_json: JSON.stringify(body.results),
      condition_rating_after: body.conditionRatingAfter,
      gps_location: body.gpsLocation ? knex.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [body.gpsLocation.lng, body.gpsLocation.lat]) : null,
      photos_json: JSON.stringify(body.photos),
      status: body.status,
      notes: body.notes,
    }).returning('*');
    return { success: true, data: insp };
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = inspectionSchema.partial().parse(request.body);
    const updateData: any = { ...body, updated_at: new Date() };
    if (body.results) updateData.results_json = JSON.stringify(body.results);
    if (body.photos) updateData.photos_json = JSON.stringify(body.photos);
    if (body.gpsLocation) updateData.gps_location = knex.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [body.gpsLocation.lng, body.gpsLocation.lat]);
    const [updated] = await knex('inspections').where({ id }).update(updateData).returning('*');
    return { success: true, data: updated };
  });

  app.get('/templates', async (request) => {
    const { utilityId } = request.user as any;
    const templates = await knex('inspection_templates').where({ utility_id: utilityId });
    return { success: true, data: templates };
  });

  app.post('/templates', async (request) => {
    const { utilityId } = request.user as any;
    const schema = z.object({
      assetTypeId: z.string().uuid(),
      name: z.string(),
      formSchema: z.any(),
      frequencyDays: z.number().optional(),
    });
    const body = schema.parse(request.body);
    const [tpl] = await knex('inspection_templates').insert({
      utility_id: utilityId,
      asset_type_id: body.assetTypeId,
      name: body.name,
      form_schema_json: JSON.stringify(body.formSchema),
      frequency_days: body.frequencyDays,
    }).returning('*');
    return { success: true, data: tpl };
  });
}
