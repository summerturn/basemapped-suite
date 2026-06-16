import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { knex } from '../../config/database.js';
import { authenticateHook } from '../auth/routes.js';
import fs from 'fs';
import { importQueue, parseCSV, parseShapefile, validateRows, importBatch } from './import-service.js';

const assetSchema = z.object({
  assetTypeId: z.string().uuid(),
  externalId: z.string().optional(),
  geometry: z.any(),
  attributes: z.record(z.any()).default({}),
  status: z.enum(['active', 'inactive', 'under_repair', 'retired', 'planned']).default('active'),
  conditionRating: z.number().min(1).max(5).optional(),
  installDate: z.string().optional(),
  material: z.string().optional(),
  diameterMm: z.number().optional(),
  lengthM: z.number().optional(),
  depthM: z.number().optional(),
  parentAssetId: z.string().uuid().optional(),
  connectedAssetIds: z.array(z.string().uuid()).optional(),
  address: z.string().optional(),
  gpsAccuracyM: z.number().optional(),
});

export async function assetRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticateHook);

  app.get('/', async (request) => {
    const { utilityId } = request.user as any;
    const { type, status, bbox } = request.query as any;
    let query = knex('assets').where({ utility_id: utilityId });
    if (type) query = query.where({ asset_type_id: type });
    if (status) query = query.where({ status });
    if (bbox) {
      const [minX, minY, maxX, maxY] = bbox.split(',').map(Number);
      query = query.whereRaw(
        'ST_Intersects(geometry, ST_MakeEnvelope(?, ?, ?, ?, 4326))',
        [minX, minY, maxX, maxY]
      );
    }
    const assets = await query.select(
      'id', 'asset_type_id', 'external_id', 'status', 'condition_rating',
      'material', 'address', 'install_date',
      knex.raw('ST_AsGeoJSON(geometry) as geometry_json')
    );
    return { success: true, data: assets.map(a => ({ ...a, geometry: a.geometry_json ? JSON.parse(a.geometry_json) : null })) };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const asset = await knex('assets').where({ id }).first();
    if (!asset) return reply.status(404).send({ success: false, error: 'Not found' });
    const geo = await knex.raw('SELECT ST_AsGeoJSON(geometry) as g FROM assets WHERE id = ?', [id]);
    return { success: true, data: { ...asset, geometry: geo.rows[0]?.g ? JSON.parse(geo.rows[0].g) : null } };
  });

  app.post('/', async (request) => {
    const { utilityId, userId } = request.user as any;
    const body = assetSchema.parse(request.body);
    const geomJson = JSON.stringify(body.geometry);
    const [asset] = await knex('assets').insert({
      utility_id: utilityId,
      asset_type_id: body.assetTypeId,
      external_id: body.externalId,
      geometry: knex.raw('ST_GeomFromGeoJSON(?)', [geomJson]),
      attributes: JSON.stringify(body.attributes),
      status: body.status,
      condition_rating: body.conditionRating,
      install_date: body.installDate,
      material: body.material,
      diameter_mm: body.diameterMm,
      length_m: body.lengthM,
      depth_m: body.depthM,
      parent_asset_id: body.parentAssetId,
      connected_asset_ids: body.connectedAssetIds,
      address: body.address,
      gps_accuracy_m: body.gpsAccuracyM,
      created_by: userId,
    }).returning('*');
    return { success: true, data: asset };
  });

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = assetSchema.partial().parse(request.body);
    const updateData: any = { ...body, updated_at: new Date() };
    if (body.geometry) updateData.geometry = knex.raw('ST_GeomFromGeoJSON(?)', [JSON.stringify(body.geometry)]);
    delete updateData.geometry;
    if (body.attributes) updateData.attributes = JSON.stringify(body.attributes);
    const [updated] = await knex('assets').where({ id }).update(updateData).returning('*');
    return { success: true, data: updated };
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await knex('assets').where({ id }).del();
    return { success: true, data: null };
  });

  app.get('/:id/inspections', async (request) => {
    const { id } = request.params as { id: string };
    const inspections = await knex('inspections').where({ asset_id: id }).orderBy('scheduled_date', 'desc');
    return { success: true, data: inspections };
  });

  app.get('/:id/work-orders', async (request) => {
    const { id } = request.params as { id: string };
    const wos = await knex('work_orders').where({ asset_id: id }).orderBy('created_at', 'desc');
    return { success: true, data: wos };
  });

  app.get('/nearby/:lat/:lon/:radiusM', async (request) => {
    const { lat, lon, radiusM } = request.params as any;
    const rows = await knex.raw(
      'SELECT * FROM fn_get_assets_in_radius(?, ?, ?)',
      [Number(lat), Number(lon), Number(radiusM)]
    );
    return { success: true, data: rows.rows };
  });

  app.post('/import/csv', async (request, reply) => {
    const { utilityId, userId } = request.user as any;
    const data = await request.file();
    if (!data) return reply.status(400).send({ success: false, error: 'No file uploaded' });

    const buffer = await data.toBuffer();
    const rows = parseCSV(buffer);
    const { valid, errors } = validateRows(rows);

    if (valid.length <= 100) {
      const result = await importBatch(valid, utilityId, userId);
      return { success: true, data: { queued: false, inserted: result.inserted, errors: result.errors } };
    }

    const job = await importQueue.add('csv-import', {
      rows: valid,
      utilityId,
      userId,
    });

    return { success: true, data: { queued: true, jobId: job.id } };
  });

  app.post('/import/shapefile', async (request, reply) => {
    const { utilityId, userId } = request.user as any;
    const data = await request.file();
    if (!data) return reply.status(400).send({ success: false, error: 'No file uploaded' });

    const tmpPath = `/tmp/shapefile-${Date.now()}.zip`;
    await fs.promises.writeFile(tmpPath, await data.toBuffer());

    try {
      const rows = await parseShapefile(tmpPath);
      const { valid, errors } = validateRows(rows);

      if (valid.length <= 100) {
        const result = await importBatch(valid, utilityId, userId);
        return { success: true, data: { queued: false, inserted: result.inserted, errors: result.errors } };
      }

      const job = await importQueue.add('shapefile-import', {
        rows: valid,
        utilityId,
        userId,
      });

      return { success: true, data: { queued: true, jobId: job.id } };
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });

  app.get('/import/:jobId/status', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = await importQueue.getJob(jobId);
    if (!job) return reply.status(404).send({ success: false, error: 'Job not found' });

    const state = await job.getState();
    const progress = job.progress ?? 0;
    return {
      success: true,
      data: {
        jobId: job.id,
        status: state,
        progress,
        result: job.returnvalue,
        failedReason: job.failedReason,
      },
    };
  });
}
