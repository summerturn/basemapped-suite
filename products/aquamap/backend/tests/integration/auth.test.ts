import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../helpers/build-app.js';
import { mockDb } from '../helpers/mock-knex.js';
import bcrypt from 'bcryptjs';

vi.mock('../../src/config/database.js', async () => {
  const { mockKnex } = await import('../helpers/mock-knex.js');
  return { knex: mockKnex };
});

describe('Auth Integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp();
  });

  it('POST /auth/register creates user and utility', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'securePass123',
        firstName: 'Test',
        lastName: 'User',
        utilityName: 'Test Utility',
        pwsid: 'TX1234567',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('test@example.com');
    expect(body.data.accessToken).toBeDefined();

    const users = mockDb._tables['users'] ?? [];
    expect(users.length).toBe(1);
    expect(users[0].email).toBe('test@example.com');

    const utilities = mockDb._tables['utilities'] ?? [];
    expect(utilities.length).toBe(1);
    expect(utilities[0].name).toBe('Test Utility');
  });

  it('POST /auth/login returns JWT', async () => {
    const hash = await bcrypt.hash('mypassword', 12);
    mockDb.seed('users', [
      {
        id: 'user-1',
        email: 'login@example.com',
        password_hash: hash,
        role: 'utility_admin',
        utility_id: 'util-1',
        first_name: 'Login',
        last_name: 'User',
      },
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'login@example.com', password: 'mypassword' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  it('POST /auth/refresh returns new access token', async () => {
    mockDb.seed('users', [
      {
        id: 'user-2',
        email: 'refresh@example.com',
        password_hash: 'hash',
        role: 'field_user',
        utility_id: 'util-2',
      },
    ]);

    const refreshToken = app.jwt.sign(
      { userId: 'user-2', type: 'refresh' },
      { expiresIn: '7d', key: 'refresh' }
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
  });

  it('GET /auth/me returns user with valid token', async () => {
    mockDb.seed('users', [
      {
        id: 'user-3',
        email: 'me@example.com',
        password_hash: 'hash',
        role: 'office_user',
        utility_id: 'util-3',
        first_name: 'Me',
        last_name: 'User',
      },
    ]);

    const token = app.jwt.sign(
      { userId: 'user-3', role: 'office_user', utilityId: 'util-3' },
      { expiresIn: '15m' }
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('me@example.com');
  });

  it('protected routes return 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
  });
});
