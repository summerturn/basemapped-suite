import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { knex } from '../../config/database.js';
import { authenticateHook } from '../auth/routes.js';

export async function syncRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticateHook);

  // Pull changes since last sync
  app.post('/pull', async (request) => {
    const { utilityId } = request.user as any;
    const schema = z.object({ since: z.string().datetime().optional(), lastSequence: z.number().optional() });
    const { since, lastSequence } = schema.parse(request.body);
    let query = knex('change_log')
      .whereIn('table_name', ['assets', 'inspections', 'work_orders'])
      .andWhere(function () {
        if (since) this.where('changed_at', '>', since);
        if (lastSequence) this.where('sequence_number', '>', lastSequence);
      });
    const changes = await query.orderBy('sequence_number', 'asc').limit(500);
    return { success: true, data: { changes, serverTime: new Date().toISOString() } };
  });

  // Push client changes
  app.post('/push', async (request) => {
    const { userId } = request.user as any;
    const schema = z.object({
      changes: z.array(z.object({
        table: z.string(),
        operation: z.enum(['INSERT', 'UPDATE', 'DELETE']),
        rowId: z.string().uuid(),
        data: z.any(),
        clientTimestamp: z.string(),
      })),
      deviceId: z.string().optional(),
    });
    const { changes, deviceId } = schema.parse(request.body);

    const [session] = await knex('sync_sessions').insert({
      user_id: userId,
      device_id: deviceId,
      changes_pushed: changes.length,
    }).returning('id');

    const results = [];
    for (const change of changes) {
      try {
        if (change.operation === 'INSERT') {
          await knex(change.table).insert(change.data);
        } else if (change.operation === 'UPDATE') {
          await knex(change.table).where({ id: change.rowId }).update(change.data);
        } else if (change.operation === 'DELETE') {
          await knex(change.table).where({ id: change.rowId }).del();
        }
        results.push({ rowId: change.rowId, status: 'ack' });
      } catch (err: any) {
        results.push({ rowId: change.rowId, status: 'reject', error: err.message });
      }
    }

    return { success: true, data: { results, sessionId: session.id } };
  });

  // WebSocket for live sync
  app.get('/ws', { websocket: true }, (connection, req) => {
    connection.socket.on('message', (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          connection.socket.send(JSON.stringify({ type: 'pong', serverTime: new Date().toISOString() }));
        }
      } catch {
        connection.socket.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
      }
    });
  });
}
