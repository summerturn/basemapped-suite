import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { knex } from '../../config/database.js';
import { authenticateHook } from '../auth/routes.js';
import fs from 'fs';
import path from 'path';

const regionSchema = z.object({
  name: z.string().min(1),
  utilityId: z.string().uuid(),
  minLat: z.number(),
  minLon: z.number(),
  maxLat: z.number(),
  maxLon: z.number(),
  minZoom: z.number().default(10),
  maxZoom: z.number().default(18),
});

export async function mapRegionRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticateHook);

  app.post('/', async (request) => {
    const { userId } = request.user as any;
    const body = regionSchema.parse(request.body);

    const [region] = await knex('map_regions')
      .insert({
        utility_id: body.utilityId,
        name: body.name,
        bounds: knex.raw('ST_MakeEnvelope(?, ?, ?, ?, 4326)', [
          body.minLon,
          body.minLat,
          body.maxLon,
          body.maxLat,
        ]),
        min_zoom: body.minZoom,
        max_zoom: body.maxZoom,
        status: 'pending',
      })
      .returning('*');

    return { success: true, data: region };
  });

  app.get('/', async (request) => {
    const { utilityId } = request.user as any;
    const regions = await knex('map_regions')
      .where({ utility_id: utilityId })
      .select('*');
    return { success: true, data: regions };
  });

  app.get('/:id/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    const region = await knex('map_regions').where({ id }).first();

    if (!region) {
      return reply.status(404).send({ success: false, error: 'Not found' });
    }

    const filePath = region.file_key
      ? path.join('/data/mbtiles', region.file_key)
      : null;

    if (!filePath || !fs.existsSync(filePath)) {
      return reply
        .status(404)
        .send({ success: false, error: 'MBTiles file not found' });
    }

    const stat = fs.statSync(filePath);
    const range = request.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      reply.status(206);
      reply.header('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      reply.header('Accept-Ranges', 'bytes');
      reply.header('Content-Length', chunkSize);
      reply.type('application/vnd.sqlite3');
      return reply.send(fs.createReadStream(filePath, { start, end }));
    }

    reply.header('Content-Length', stat.size);
    reply.header('Accept-Ranges', 'bytes');
    reply.type('application/vnd.sqlite3');
    return reply.send(fs.createReadStream(filePath));
  });
}
