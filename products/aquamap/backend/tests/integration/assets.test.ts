import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../helpers/build-app.js';
import { mockDb } from '../helpers/mock-knex.js';

vi.mock('../../src/config/database.js', async () => {
  const { mockKnex } = await import('../helpers/mock-knex.js');
  return { knex: mockKnex };
});

describe('Assets Integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;

  beforeEach(async () => {
    app = await buildApp();
    mockDb.seed('users', [
      {
        id: 'user-1',
        email: 'asset@example.com',
        password_hash: 'hash',
        role: 'utility_admin',
        utility_id: 'util-1',
        first_name: 'Asset',
        last_name: 'User',
      },
    ]);
    token = app.jwt.sign(
      { userId: 'user-1', role: 'utility_admin', utilityId: 'util-1' },
      { expiresIn: '15m' }
    );
  });

  it('POST /assets creates asset', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        assetTypeId: 'type-1',
        externalId: 'HYD-001',
        geometry: { type: 'Point', coordinates: [-85.0, 40.0] },
        attributes: { owner: 'city' },
        status: 'active',
        material: 'PVC',
        address: '123 Main St',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.external_id).toBe('HYD-001');

    const assets = mockDb._tables['assets'] ?? [];
    expect(assets.length).toBe(1);
    expect(assets[0].external_id).toBe('HYD-001');
  });

  it('GET /assets returns list', async () => {
    mockDb.seed('assets', [
      {
        id: 'asset-1',
        utility_id: 'util-1',
        asset_type_id: 'type-1',
        external_id: 'A1',
        status: 'active',
        material: 'PVC',
      },
      {
        id: 'asset-2',
        utility_id: 'util-1',
        asset_type_id: 'type-2',
        external_id: 'A2',
        status: 'inactive',
        material: 'Ductile Iron',
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(2);
  });

  it('GET /assets/:id returns single asset', async () => {
    mockDb.seed('assets', [
      {
        id: 'asset-3',
        utility_id: 'util-1',
        asset_type_id: 'type-1',
        external_id: 'A3',
        status: 'active',
        material: 'Steel',
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/asset-3',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.external_id).toBe('A3');
  });

  it('PUT /assets/:id updates asset', async () => {
    mockDb.seed('assets', [
      {
        id: 'asset-4',
        utility_id: 'util-1',
        asset_type_id: 'type-1',
        external_id: 'A4',
        status: 'active',
        material: 'PVC',
      },
    ]);

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/assets/asset-4',
      headers: { authorization: `Bearer ${token}` },
      payload: { material: 'HDPE', status: 'under_repair' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.material).toBe('HDPE');
    expect(body.data.status).toBe('under_repair');
  });

  it('DELETE /assets/:id deletes asset', async () => {
    mockDb.seed('assets', [
      {
        id: 'asset-5',
        utility_id: 'util-1',
        asset_type_id: 'type-1',
        external_id: 'A5',
        status: 'active',
      },
    ]);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/assets/asset-5',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);

    const assets = mockDb._tables['assets'] ?? [];
    expect(assets.find((a) => a.id === 'asset-5')).toBeUndefined();
  });

  it('GET /assets/nearby/:lat/:lon/:radiusM returns nearby assets', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/nearby/40.0/-85.0/500',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
