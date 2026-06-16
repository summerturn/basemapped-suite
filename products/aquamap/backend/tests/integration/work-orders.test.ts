import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../helpers/build-app.js';
import { mockDb } from '../helpers/mock-knex.js';

vi.mock('../../src/config/database.js', async () => {
  const { mockKnex } = await import('../helpers/mock-knex.js');
  return { knex: mockKnex };
});

describe('Work Orders Integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;

  beforeEach(async () => {
    app = await buildApp();
    mockDb.seed('users', [
      {
        id: 'user-1',
        email: 'wo@example.com',
        password_hash: 'hash',
        role: 'utility_admin',
        utility_id: 'util-1',
        first_name: 'WO',
        last_name: 'User',
      },
    ]);
    token = app.jwt.sign(
      { userId: 'user-1', role: 'utility_admin', utilityId: 'util-1' },
      { expiresIn: '15m' }
    );
  });

  it('status transition validation works', async () => {
    mockDb.seed('work_orders', [
      {
        id: 'wo-1',
        utility_id: 'util-1',
        title: 'Fix leak',
        status: 'draft',
        created_at: new Date().toISOString(),
      },
    ]);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/work-orders/wo-1',
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'open' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('open');
  });

  it('invalid transitions return 400', async () => {
    mockDb.seed('work_orders', [
      {
        id: 'wo-2',
        utility_id: 'util-1',
        title: 'Replace valve',
        status: 'draft',
        created_at: new Date().toISOString(),
      },
    ]);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/work-orders/wo-2',
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'completed' },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid status transition');
  });
});
