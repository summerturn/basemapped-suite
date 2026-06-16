import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { knex } from '../../config/database.js';
import { authenticateHook } from '../auth/routes.js';

const crewSchema = z.object({
  name: z.string().min(1),
  supervisorId: z.string().uuid().optional(),
  memberIds: z.array(z.string().uuid()).default([]),
  defaultTerritory: z.any().optional(),
  active: z.boolean().default(true),
});

export async function crewRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticateHook);

  app.get('/', async (request) => {
    const { utilityId } = request.user as any;
    const crews = await knex('crews').where({ utility_id: utilityId }).orderBy('name');
    return { success: true, data: crews };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const crew = await knex('crews').where({ id }).first();
    if (!crew) return reply.status(404).send({ success: false, error: 'Not found' });
    return { success: true, data: crew };
  });

  app.post('/', async (request) => {
    const { utilityId } = request.user as any;
    const body = crewSchema.parse(request.body);
    const [crew] = await knex('crews').insert({
      utility_id: utilityId,
      name: body.name,
      supervisor_id: body.supervisorId,
      member_ids: body.memberIds,
      default_territory: body.defaultTerritory ? knex.raw('ST_GeomFromGeoJSON(?)', [JSON.stringify(body.defaultTerritory)]) : null,
      active: body.active,
    }).returning('*');
    return { success: true, data: crew };
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = crewSchema.partial().parse(request.body);
    const updateData: any = { ...body, updated_at: new Date() };
    if (body.defaultTerritory) updateData.default_territory = knex.raw('ST_GeomFromGeoJSON(?)', [JSON.stringify(body.defaultTerritory)]);
    const [updated] = await knex('crews').where({ id }).update(updateData).returning('*');
    return { success: true, data: updated };
  });

  app.get('/:id/schedule', async (request) => {
    const { id } = request.params as { id: string };
    const schedule = await knex('crew_schedules').where({ crew_id: id }).orderBy('start_datetime');
    return { success: true, data: schedule };
  });
}
