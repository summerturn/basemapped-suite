import { FastifyInstance } from 'fastify';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    if (error.validation) {
      return reply.status(400).send({ success: false, error: 'Validation error', details: error.message });
    }
    reply.status(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  });
}
