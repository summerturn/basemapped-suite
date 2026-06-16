import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { knex } from '../../config/database.js';
import { authenticateHook } from '../auth/routes.js';

const woSchema = z.object({
  assetId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  woType: z.string().optional(),
  priority: z.enum(['emergency', 'high', 'medium', 'low']).default('medium'),
  status: z.enum(['draft', 'open', 'assigned', 'in_progress', 'on_hold', 'completed', 'verified', 'closed']).default('draft'),
  assignedCrewId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  scheduledDate: z.string().optional(),
  laborHours: z.number().optional(),
  partsUsed: z.array(z.any()).default([]),
  photos: z.array(z.any()).default([]),
  notes: z.string().optional(),
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['open'],
  open: ['assigned', 'on_hold'],
  assigned: ['in_progress', 'on_hold'],
  in_progress: ['completed', 'on_hold'],
  on_hold: ['open', 'in_progress'],
  completed: ['verified'],
  verified: ['closed'],
  closed: [],
};

export async function workOrderRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticateHook);

  app.get('/', async (request) => {
    const { utilityId } = request.user as any;
    const { status, priority, assignedTo } = request.query as any;
    let query = knex('work_orders').where({ utility_id: utilityId });
    if (status) query = query.where({ status });
    if (priority) query = query.where({ priority });
    if (assignedTo) query = query.where({ assigned_user_id: assignedTo });
    const wos = await query.orderBy('created_at', 'desc');
    return { success: true, data: wos };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const wo = await knex('work_orders').where({ id }).first();
    if (!wo) return reply.status(404).send({ success: false, error: 'Not found' });
    return { success: true, data: wo };
  });

  app.post('/', async (request) => {
    const { utilityId, userId } = request.user as any;
    const body = woSchema.parse(request.body);
    const [wo] = await knex('work_orders').insert({
      utility_id: utilityId,
      asset_id: body.assetId,
      title: body.title,
      description: body.description,
      wo_type: body.woType,
      priority: body.priority,
      status: body.status,
      assigned_crew_id: body.assignedCrewId,
      assigned_user_id: body.assignedUserId,
      scheduled_date: body.scheduledDate,
      labor_hours: body.laborHours,
      parts_used_json: JSON.stringify(body.partsUsed),
      photos: JSON.stringify(body.photos),
      notes: body.notes,
      created_by: userId,
    }).returning('*');
    return { success: true, data: wo };
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = woSchema.partial().parse(request.body);
    const current = await knex('work_orders').where({ id }).first();
    if (!current) return reply.status(404).send({ success: false, error: 'Not found' });
    if (body.status && !VALID_TRANSITIONS[current.status]?.includes(body.status)) {
      return reply.status(400).send({ success: false, error: `Invalid status transition from ${current.status} to ${body.status}` });
    }
    const updateData: any = { ...body, updated_at: new Date() };
    if (body.partsUsed) updateData.parts_used_json = JSON.stringify(body.partsUsed);
    if (body.photos) updateData.photos = JSON.stringify(body.photos);
    if (body.status === 'completed') updateData.completed_at = new Date();
    if (body.status === 'in_progress' && !current.started_at) updateData.started_at = new Date();
    const [updated] = await knex('work_orders').where({ id }).update(updateData).returning('*');
    return { success: true, data: updated };
  });
}
