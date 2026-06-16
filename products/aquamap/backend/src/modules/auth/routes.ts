import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { knex } from '../../config/database.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string(),
  lastName: z.string(),
  utilityName: z.string(),
  pwsid: z.string().optional(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);
    const user = await knex('users').where({ email }).first();
    if (!user) return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return reply.status(401).send({ success: false, error: 'Invalid credentials' });

    const accessToken = app.jwt.sign(
      { userId: user.id, role: user.role, utilityId: user.utility_id },
      { expiresIn: '15m' }
    );
    const refreshToken = app.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d', key: 'refresh' }
    );

    await knex('users').where({ id: user.id }).update({ last_login: new Date() });
    return { success: true, data: { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name } } };
  });

  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = await knex('users').where({ email: body.email }).first();
    if (existing) return reply.status(409).send({ success: false, error: 'Email already registered' });

    const hash = await bcrypt.hash(body.password, 12);
    const [utility] = await knex('utilities').insert({
      name: body.utilityName,
      pwsid: body.pwsid,
      utility_type: 'community_water',
    }).returning('id');

    const [user] = await knex('users').insert({
      utility_id: utility.id,
      email: body.email,
      password_hash: hash,
      first_name: body.firstName,
      last_name: body.lastName,
      role: 'utility_admin',
    }).returning('*');

    const accessToken = app.jwt.sign(
      { userId: user.id, role: user.role, utilityId: user.utility_id },
      { expiresIn: '15m' }
    );
    return { success: true, data: { accessToken, user: { id: user.id, email: user.email, role: user.role } } };
  });

  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(request.body);
    try {
      const decoded = app.jwt.verify(refreshToken, { key: 'refresh' }) as { userId: string };
      const user = await knex('users').where({ id: decoded.userId }).first();
      if (!user) return reply.status(401).send({ success: false, error: 'Invalid token' });
      const accessToken = app.jwt.sign(
        { userId: user.id, role: user.role, utilityId: user.utility_id },
        { expiresIn: '15m' }
      );
      return { success: true, data: { accessToken } };
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid refresh token' });
    }
  });

  app.get('/me', { onRequest: [app.authenticate] }, async (request) => {
    const user = await knex('users').where({ id: (request.user as any).userId }).first();
    return { success: true, data: user };
  });
}

// Auth hook
export async function authenticateHook(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
}
