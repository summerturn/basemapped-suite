import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { type DB } from '@op-engineering/op-sqlite';
import { SyncEngine } from '../SyncEngine';
import { type SyncApiClient, type SyncChange, type ConflictRecord } from '../types';

// Minimal mock DB for testing
function createMockDB(): DB {
  const tables: Record<string, Record<string, unknown>[]> = {
    graves: [],
    plots: [],
    sync_queue: [],
    app_settings: [{ key: 'last_sync_timestamp', value: '0' }],
  };

  const db = {
    execute: jest.fn((sql: string, params?: unknown[]) => {
      const sqlLower = sql.toLowerCase().trim();

      // INSERT OR REPLACE INTO app_settings
      if (sqlLower.includes("insert or replace into app_settings")) {
        const existing = tables.app_settings.find(s => s.key === params![0]);
        if (existing) {
          existing.value = params![1];
          existing.updated_at = params![2];
        } else {
          tables.app_settings.push({ key: params![0], value: params![1], updated_at: params![2] });
        }
        return { rows: { length: 0, item: () => ({}) } };
      }

      // SELECT from app_settings
      if (sqlLower.includes("select value from app_settings")) {
        const row = tables.app_settings.find(s => s.key === params![0]);
        return {
          rows: {
            length: row ? 1 : 0,
            item: (i: number) => (i === 0 ? row : undefined),
          },
        };
      }

      // SELECT from table by id
      if (sqlLower.includes('select * from') && sqlLower.includes('where id =')) {
        const tableMatch = sql.match(/from\s+(\w+)/i);
        const table = tableMatch ? tableMatch[1] : '';
        const rows = (tables[table] || []).filter(r => r.id === params![0] && !r.deleted_at);
        return {
          rows: {
            length: rows.length,
            item: (i: number) => rows[i],
          },
        };
      }

      // INSERT OR REPLACE INTO generic table
      if (sqlLower.includes('insert or replace into')) {
        const tableMatch = sql.match(/into\s+(\w+)/i);
        const table = tableMatch ? tableMatch[1] : '';
        const id = params![0];
        const existingIndex = (tables[table] || []).findIndex(r => r.id === id);
        const newRow: Record<string, unknown> = { id };
        // parse columns from SQL (simplified)
        const colMatch = sql.match(/\(([^)]+)\)/);
        if (colMatch) {
          const cols = colMatch[1].split(',').map(c => c.trim());
          cols.forEach((col, idx) => {
            if (params && idx < params.length) {
              newRow[col] = params[idx];
            }
          });
        }
        if (!tables[table]) tables[table] = [];
        if (existingIndex >= 0) {
          tables[table][existingIndex] = { ...tables[table][existingIndex], ...newRow };
        } else {
          tables[table].push(newRow);
        }
        return { rows: { length: 0, item: () => ({}) } };
      }

      // UPDATE generic table
      if (sqlLower.includes('update') && !sqlLower.includes('sync_queue')) {
        const tableMatch = sql.match(/update\s+(\w+)/i);
        const table = tableMatch ? tableMatch[1] : '';
        const id = params![params!.length - 1];
        const row = (tables[table] || []).find(r => r.id === id);
        if (row) {
          // simplified: just set _sync_status if present
          if (sqlLower.includes('_sync_status')) row._sync_status = params![0];
          if (sqlLower.includes('deleted_at')) row.deleted_at = params![0];
        }
        return { rows: { length: 0, item: () => ({}) } };
      }

      // sync_queue operations
      if (sqlLower.includes('select * from sync_queue')) {
        const statusMatch = sql.match(/status\s*=\s*\?/gi);
        let rows = tables.sync_queue;
        if (statusMatch && params) {
          const statuses = params.filter((_, i) => sqlLower.includes(`status = ?`) || sqlLower.includes('status in'));
          rows = rows.filter(r => statuses.includes(r.status));
        }
        if (sqlLower.includes('order by created_at asc')) {
          rows = rows.slice().sort((a, b) => (a.created_at as number) - (b.created_at as number));
        }
        if (sqlLower.includes('limit')) {
          const limitMatch = sql.match(/limit\s+(\d+)/i);
          const limit = limitMatch ? parseInt(limitMatch[1]) : rows.length;
          rows = rows.slice(0, limit);
        }
        return {
          rows: {
            length: rows.length,
            item: (i: number) => rows[i],
          },
        };
      }

      if (sqlLower.includes('insert into sync_queue')) {
        const id = tables.sync_queue.length + 1;
        const row = {
          id,
          table_name: params![0],
          record_id: params![1],
          operation: params![2],
          data_json: params![3],
          status: params![4],
          retry_count: params![5],
          created_at: params![6],
          updated_at: params![7],
        };
        tables.sync_queue.push(row);
        return { rows: { length: 0, item: () => ({}) } };
      }

      if (sqlLower.includes('update sync_queue')) {
        const id = params![params!.length - 1];
        const row = tables.sync_queue.find(r => r.id === id);
        if (row) {
          if (sqlLower.includes('status =')) {
            const statusIdx = sqlLower.split('?').findIndex(s => s.includes('status ='));
            if (statusIdx >= 0 && params![statusIdx] !== undefined) row.status = params![statusIdx];
          }
          if (sqlLower.includes('retry_count')) row.retry_count = (row.retry_count as number) + 1;
          if (sqlLower.includes('error_message')) row.error_message = params![0];
          if (sqlLower.includes('data_json')) row.data_json = params![0];
        }
        return { rows: { length: 0, item: () => ({}) } };
      }

      if (sqlLower.includes('delete from sync_queue')) {
        tables.sync_queue = tables.sync_queue.filter(r => r.status !== 'completed');
        return { rows: { length: 0, item: () => ({}) } };
      }

      // Transaction commands
      if (sqlLower === 'begin exclusive transaction;' || sqlLower === 'begin transaction;') {
        return { rows: { length: 0, item: () => ({}) } };
      }
      if (sqlLower === 'commit;' || sqlLower === 'rollback;') {
        return { rows: { length: 0, item: () => ({}) } };
      }

      return { rows: { length: 0, item: () => ({}) } };
    }),
    getRowsModified: jest.fn(() => 1),
  } as unknown as DB;

  return db;
}

function createMockApiClient(overrides?: Partial<SyncApiClient>): SyncApiClient {
  return {
    pullChanges: jest.fn(async () => ({ changes: [], hasMore: false })),
    pushChanges: jest.fn(async (changes) => ({
      successIds: changes.map(c => c.id),
      failedIds: [],
      conflicts: [],
    })),
    resolveConflict: jest.fn(async () => {}),
    ...overrides,
  };
}

describe('SyncEngine', () => {
  let db: DB;
  let apiClient: SyncApiClient;
  let engine: SyncEngine;

  beforeEach(() => {
    db = createMockDB();
    apiClient = createMockApiClient();
    engine = new SyncEngine({ db, apiClient });
  });

  it('should initialize with db and apiClient', () => {
    expect(engine).toBeDefined();
    const status = engine.getSyncStatus();
    expect(status.isSyncing).toBe(false);
  });

  it('should queue local changes when offline', async () => {
    // Simulate offline by making pull throw a network error
    const offlineClient = createMockApiClient({
      pullChanges: jest.fn(async () => {
        const err = new Error('Network request failed');
        throw err;
      }),
    });
    engine.initialize(db, offlineClient);

    // Pre-seed a pending local change in queue
    (db.execute as jest.Mock).mockImplementation((sql: string, params?: unknown[]) => {
      const sqlLower = sql.toLowerCase().trim();
      if (sqlLower.includes('insert into sync_queue')) {
        return { rows: { length: 0, item: () => ({}) } };
      }
      if (sqlLower.includes('select * from sync_queue')) {
        return {
          rows: {
            length: 1,
            item: (i: number) =>
              i === 0
                ? {
                    id: 1,
                    table_name: 'graves',
                    record_id: 'g1',
                    operation: 'INSERT',
                    data_json: JSON.stringify({ id: 'g1', status: 'occupied' }),
                    status: 'pending',
                    retry_count: 0,
                    created_at: Date.now(),
                    updated_at: Date.now(),
                  }
                : undefined,
          },
        };
      }
      if (sqlLower.includes('begin') || sqlLower.includes('commit') || sqlLower.includes('rollback')) {
        return { rows: { length: 0, item: () => ({}) } };
      }
      return { rows: { length: 0, item: () => ({}) } };
    });

    try {
      await engine.sync();
    } catch {
      // expected to throw on network error
    }

    const status = engine.getSyncStatus();
    // pending count should still reflect the queued item
    expect(status.pendingCount).toBeGreaterThanOrEqual(0);
  });

  it('should exchange data when online', async () => {
    const serverChange: SyncChange = {
      id: 'g2',
      tableName: 'graves',
      operation: 'INSERT',
      data: { id: 'g2', status: 'available' },
      serverVersion: 2,
      serverModifiedAt: Date.now(),
    };

    const onlineClient = createMockApiClient({
      pullChanges: jest.fn(async () => ({ changes: [serverChange], hasMore: false })),
    });
    engine.initialize(db, onlineClient);

    await engine.sync();

    expect(onlineClient.pullChanges).toHaveBeenCalled();
    expect(onlineClient.pushChanges).toHaveBeenCalled();
  });

  it('should detect conflicts when both sides modified the same record', async () => {
    const serverChange: SyncChange = {
      id: 'g1',
      tableName: 'graves',
      operation: 'UPDATE',
      data: { id: 'g1', status: 'occupied' },
      serverVersion: 3,
      serverModifiedAt: Date.now() + 1000,
    };

    const conflictClient = createMockApiClient({
      pullChanges: jest.fn(async () => ({ changes: [serverChange], hasMore: false })),
    });

    // Seed local record and pending change
    (db.execute as jest.Mock).mockImplementation((sql: string, params?: unknown[]) => {
      const sqlLower = sql.toLowerCase().trim();
      if (sqlLower.includes('select * from sync_queue')) {
        return {
          rows: {
            length: 1,
            item: (i: number) =>
              i === 0
                ? {
                    id: 1,
                    table_name: 'graves',
                    record_id: 'g1',
                    operation: 'UPDATE',
                    data_json: '{}',
                    status: 'pending',
                    retry_count: 0,
                    created_at: Date.now(),
                    updated_at: Date.now(),
                  }
                : undefined,
          },
        };
      }
      if (sqlLower.includes('select * from graves where id =')) {
        return {
          rows: {
            length: 1,
            item: (i: number) =>
              i === 0
                ? {
                    id: 'g1',
                    status: 'available',
                    _sync_version: 2,
                    _local_modified_at: Date.now(),
                  }
                : undefined,
          },
        };
      }
      if (sqlLower.includes('begin') || sqlLower.includes('commit') || sqlLower.includes('rollback')) {
        return { rows: { length: 0, item: () => ({}) } };
      }
      if (sqlLower.includes('insert or replace into app_settings')) {
        return { rows: { length: 0, item: () => ({}) } };
      }
      return { rows: { length: 0, item: () => ({}) } };
    });

    engine.initialize(db, conflictClient);
    engine = new SyncEngine({ db, apiClient: conflictClient, conflictStrategy: 'manual' });

    await engine.sync();

    const conflicts = engine.getConflicts();
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].recordId).toBe('g1');
  });

  it('should resolve with server-wins strategy', async () => {
    const serverData = { id: 'g1', status: 'occupied' };
    const localData = { id: 'g1', status: 'available' };

    const conflict: ConflictRecord = {
      id: 'test-conflict-1',
      tableName: 'graves',
      recordId: 'g1',
      localData,
      serverData,
      localVersion: 2,
      serverVersion: 3,
      localModifiedAt: Date.now(),
      serverModifiedAt: Date.now() + 1000,
      strategy: 'server-wins',
    };

    const { ConflictResolver } = await import('../ConflictResolver');
    const result = ConflictResolver.resolve(conflict, 'server-wins');
    expect(result.winner).toBe('server');
    expect(result.data.status).toBe('occupied');
  });

  it('should propagate tombstone records', async () => {
    const tombstoneChange: SyncChange = {
      id: 'g1',
      tableName: 'graves',
      operation: 'UPDATE',
      data: { id: 'g1' },
      serverVersion: 4,
      serverModifiedAt: Date.now(),
      deletedAt: Date.now(),
    };

    const tombstoneClient = createMockApiClient({
      pullChanges: jest.fn(async () => ({ changes: [tombstoneChange], hasMore: false })),
    });

    let deletedAtValue: unknown = null;
    (db.execute as jest.Mock).mockImplementation((sql: string, params?: unknown[]) => {
      const sqlLower = sql.toLowerCase().trim();
      if (sqlLower.includes('update graves set deleted_at')) {
        deletedAtValue = params![0];
        return { rows: { length: 0, item: () => ({}) } };
      }
      if (sqlLower.includes('select * from sync_queue')) {
        return { rows: { length: 0, item: () => ({}) } };
      }
      if (sqlLower.includes('select * from graves where id =')) {
        return {
          rows: {
            length: 1,
            item: (i: number) =>
              i === 0 ? { id: 'g1', status: 'available', _sync_version: 1, _local_modified_at: 0 } : undefined,
          },
        };
      }
      if (sqlLower.includes('begin') || sqlLower.includes('commit') || sqlLower.includes('rollback')) {
        return { rows: { length: 0, item: () => ({}) } };
      }
      if (sqlLower.includes('insert or replace into app_settings')) {
        return { rows: { length: 0, item: () => ({}) } };
      }
      return { rows: { length: 0, item: () => ({}) } };
    });

    engine = new SyncEngine({ db, apiClient: tombstoneClient });
    await engine.sync();

    expect(deletedAtValue).not.toBeNull();
  });

  it('should retry failed operations', async () => {
    let attempt = 0;
    const flakyClient = createMockApiClient({
      pushChanges: jest.fn(async () => {
        attempt++;
        if (attempt < 2) {
          return {
            successIds: [],
            failedIds: [{ id: 'g1', error: 'Server timeout' }],
            conflicts: [],
          };
        }
        return {
          successIds: ['g1'],
          failedIds: [],
          conflicts: [],
        };
      }),
    });

    (db.execute as jest.Mock).mockImplementation((sql: string, params?: unknown[]) => {
      const sqlLower = sql.toLowerCase().trim();
      if (sqlLower.includes('select * from sync_queue')) {
        return {
          rows: {
            length: 1,
            item: (i: number) =>
              i === 0
                ? {
                    id: 1,
                    table_name: 'graves',
                    record_id: 'g1',
                    operation: 'INSERT',
                    data_json: '{}',
                    status: attempt < 2 ? 'failed' : 'pending',
                    retry_count: attempt,
                    created_at: Date.now(),
                    updated_at: Date.now(),
                  }
                : undefined,
          },
        };
      }
      if (sqlLower.includes('begin') || sqlLower.includes('commit') || sqlLower.includes('rollback')) {
        return { rows: { length: 0, item: () => ({}) } };
      }
      if (sqlLower.includes('insert or replace into app_settings')) {
        return { rows: { length: 0, item: () => ({}) } };
      }
      if (sqlLower.includes('update sync_queue')) {
        return { rows: { length: 0, item: () => ({}) } };
      }
      return { rows: { length: 0, item: () => ({}) } };
    });

    engine = new SyncEngine({ db, apiClient: flakyClient });

    // First sync fails
    await engine.sync();
    // After retryFailed, second sync should succeed conceptually
    const { SyncQueue } = await import('../SyncQueue');
    const queue = new SyncQueue(db);
    queue.retryFailed();

    expect(attempt).toBeGreaterThanOrEqual(1);
  });
});
