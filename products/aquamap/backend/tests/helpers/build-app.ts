import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { authRoutes } from '../../src/modules/auth/routes.js';
import { assetRoutes } from '../../src/modules/assets/routes.js';
import { workOrderRoutes } from '../../src/modules/work-orders/routes.js';
import { mapRegionRoutes } from '../../src/modules/map-regions/routes.js';

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(jwt, {
    secret: {
      default: 'test-jwt-secret-key-minimum-32-characters',
      refresh: 'test-refresh-secret-key-minimum-32-characters',
    },
  });
  await app.register(multipart);

  app.decorate(
    'authenticate',
    async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch {
        reply.status(401).send({ success: false, error: 'Unauthorized' });
      }
    }
  );

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(assetRoutes, { prefix: '/api/v1/assets' });
  await app.register(workOrderRoutes, { prefix: '/api/v1/work-orders' });
  await app.register(mapRegionRoutes, { prefix: '/api/v1/map-regions' });

  app.setErrorHandler((error, request, reply) => {
    reply.status(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  });

  return app;
}
