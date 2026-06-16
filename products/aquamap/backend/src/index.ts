import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';
import { knex } from './config/database.js';
import { authRoutes } from './modules/auth/routes.js';
import { utilityRoutes } from './modules/utilities/routes.js';
import { assetRoutes } from './modules/assets/routes.js';
import { inspectionRoutes } from './modules/inspections/routes.js';
import { workOrderRoutes } from './modules/work-orders/routes.js';
import { crewRoutes } from './modules/crews/routes.js';
import { syncRoutes } from './modules/sync/routes.js';
import { complianceRoutes } from './modules/compliance/routes.js';
import { fileRoutes } from './modules/files/routes.js';
import { mapRegionRoutes } from './modules/map-regions/routes.js';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  },
});

await app.register(cors, { origin: true, credentials: true });
await app.register(helmet);
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
await app.register(websocket);

await app.register(swagger, {
  openapi: {
    info: { title: 'AquaMap API', version: '0.1.0', description: 'Water/wastewater utility GIS API' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
});
await app.register(swaggerUi, { routePrefix: '/docs' });

await app.register(jwt, { secret: env.JWT_SECRET });

app.decorate('authenticate', async (request: any, reply: any) => {
  try { await request.jwtVerify(); } catch { reply.status(401).send({ success: false, error: 'Unauthorized' }); }
});

app.get('/health', async () => {
  await knex.raw('SELECT 1');
  return { status: 'ok', timestamp: new Date().toISOString() };
});

await app.register(authRoutes, { prefix: '/api/v1/auth' });
await app.register(utilityRoutes, { prefix: '/api/v1/utilities' });
await app.register(assetRoutes, { prefix: '/api/v1/assets' });
await app.register(inspectionRoutes, { prefix: '/api/v1/inspections' });
await app.register(workOrderRoutes, { prefix: '/api/v1/work-orders' });
await app.register(crewRoutes, { prefix: '/api/v1/crews' });
await app.register(syncRoutes, { prefix: '/api/v1/sync' });
await app.register(complianceRoutes, { prefix: '/api/v1/compliance' });
await app.register(fileRoutes, { prefix: '/api/v1/files' });
await app.register(mapRegionRoutes, { prefix: '/api/v1/map-regions' });

app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.status(error.statusCode || 500).send({
    success: false,
    error: error.message || 'Internal Server Error',
  });
});

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`AquaMap API running on port ${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Integration routes
import { integrationRoutes } from './modules/integrations/routes.js';
await app.register(integrationRoutes, { prefix: '/api/v1/integrations' });
