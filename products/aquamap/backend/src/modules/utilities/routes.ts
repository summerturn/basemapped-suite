import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { knex } from '../../config/database.js';
import { authenticateHook } from '../auth/routes.js';

const utilitySchema = z.object({
  name: z.string().min(1),
  pwsid: z.string().optional(),
  utilityType: z.enum(['community_water', 'nontrans_noncommunity', 'transient_noncommunity', 'wastewater']).optional(),
  populationServed: z.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export async function utilityRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticateHook);

  app.get('/', async (request) => {
    const { role, utilityId } = request.user as any;
    let query = knex('utilities').select('*');
    if (role !== 'super_admin') query = query.where({ id: utilityId });
    const utilities = await query;
    return { success: true, data: utilities };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const utility = await knex('utilities').where({ id }).first();
    if (!utility) return reply.status(404).send({ success: false, error: 'Not found' });
    return { success: true, data: utility };
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = utilitySchema.partial().parse(request.body);
    const [updated] = await knex('utilities').where({ id }).update(body).returning('*');
    return { success: true, data: updated };
  });

  app.get('/:id/users', async (request) => {
    const { id } = request.params as { id: string };
    const users = await knex('users').where({ utility_id: id }).select('id', 'email', 'first_name', 'last_name', 'role', 'status', 'last_login');
    return { success: true, data: users };
  });
}
