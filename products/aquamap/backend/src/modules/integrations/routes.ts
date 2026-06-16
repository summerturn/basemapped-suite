import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateHook } from '../auth/routes.js';
import { GeoLintImportClient } from '../../../../integrations/clients/aquamap-geolint/client.js';

const geolint = new GeoLintImportClient();

export async function integrationRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticateHook);

  app.post('/validate-import', async (request, reply) => {
    const schema = z.object({
      fileKey: z.string(),
      utilityId: z.string().uuid(),
      importType: z.enum(['csv', 'shapefile']).default('csv'),
      ruleSet: z.string().default('standard'),
    });
    const body = schema.parse(request.body);

    try {
      const result = await geolint.validateImport(body);
      return { success: true, data: result };
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: `GeoLint validation failed: ${err.message}` });
    }
  });

  app.post('/render-on-mapdrop', async (request) => {
    const schema = z.object({
      assetIds: z.array(z.string().uuid()),
      style: z.enum(['default', 'satellite', 'utility']).default('utility'),
    });
    const { assetIds, style } = schema.parse(request.body);
    const { utilityId } = request.user as any;

    const MapDropRenderClient = (await import('../../../../integrations/clients/aquamap-mapdrop/client.js')).MapDropRenderClient;
    const client = new MapDropRenderClient();
    const result = await client.renderAssets({ utilityId, assetIds, style });

    return { success: true, data: result };
  });
}
