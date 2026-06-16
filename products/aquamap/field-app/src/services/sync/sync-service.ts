import { SQLiteDatabase } from 'expo-sqlite';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.aquamap.local';

export interface SyncState {
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  isSyncing: boolean;
  pendingCount: number;
}

export async function getSyncState(db: SQLiteDatabase): Promise<SyncState> {
  const row = await db.getFirstAsync<any>('SELECT * FROM sync_state WHERE id = 1');
  if (!row) {
    await db.runAsync('INSERT INTO sync_state (id) VALUES (1)');
    return { lastPulledAt: null, lastPushedAt: null, isSyncing: false, pendingCount: 0 };
  }
  const pending = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM pending_changes');
  return {
    lastPulledAt: row.last_pulled_at ?? null,
    lastPushedAt: row.last_pushed_at ?? null,
    isSyncing: !!row.is_syncing,
    pendingCount: pending?.count ?? 0,
  };
}

export async function queueChange(
  db: SQLiteDatabase,
  tableName: string,
  recordId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: object
) {
  await db.runAsync(
    'INSERT INTO pending_changes (table_name, record_id, action, payload, created_at) VALUES (?, ?, ?, ?, ?)',
    [tableName, recordId, action, JSON.stringify(payload), new Date().toISOString()]
  );
  const pending = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM pending_changes');
  await db.runAsync('UPDATE sync_state SET pending_count = ? WHERE id = 1', [pending?.count ?? 0]);
}

export async function pullChanges(db: SQLiteDatabase, token: string) {
  const state = await getSyncState(db);
  const lastPulled = state.lastPulledAt || '1970-01-01T00:00:00.000Z';

  const response = await fetch(`${API_BASE}/api/sync/pull?since=${encodeURIComponent(lastPulled)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Pull failed');
  const data = await response.json();

  await db.withTransactionAsync(async () => {
    for (const asset of data.assets || []) {
      await db.runAsync(
        `INSERT INTO assets (id, type, latitude, longitude, address, status, properties, created_at, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         type=excluded.type, latitude=excluded.latitude, longitude=excluded.longitude,
         address=excluded.address, status=excluded.status, properties=excluded.properties,
         updated_at=excluded.updated_at, synced_at=excluded.synced_at`,
        [asset.id, asset.type, asset.latitude, asset.longitude, asset.address, asset.status, JSON.stringify(asset.properties), asset.created_at, asset.updated_at, new Date().toISOString()]
      );
    }
    for (const inspection of data.inspections || []) {
      await db.runAsync(
        `INSERT INTO inspections (id, asset_id, type, status, due_date, completed_at, inspector_id, form_data, photos, signature, gps_lat, gps_lon, notes, created_at, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         asset_id=excluded.asset_id, type=excluded.type, status=excluded.status, due_date=excluded.due_date,
         completed_at=excluded.completed_at, inspector_id=excluded.inspector_id, form_data=excluded.form_data,
         photos=excluded.photos, signature=excluded.signature, gps_lat=excluded.gps_lat, gps_lon=excluded.gps_lon,
         notes=excluded.notes, updated_at=excluded.updated_at, synced_at=excluded.synced_at`,
        [inspection.id, inspection.asset_id, inspection.type, inspection.status, inspection.due_date, inspection.completed_at, inspection.inspector_id, JSON.stringify(inspection.form_data), JSON.stringify(inspection.photos), inspection.signature, inspection.gps_lat, inspection.gps_lon, inspection.notes, inspection.created_at, inspection.updated_at, new Date().toISOString()]
      );
    }
    for (const wo of data.work_orders || []) {
      await db.runAsync(
        `INSERT INTO work_orders (id, title, description, status, priority, assigned_to, asset_id, clock_in, clock_out, parts_used, photos_before, photos_after, notes, signature, gps_lat, gps_lon, created_at, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         title=excluded.title, description=excluded.description, status=excluded.status, priority=excluded.priority,
         assigned_to=excluded.assigned_to, asset_id=excluded.asset_id, clock_in=excluded.clock_in, clock_out=excluded.clock_out,
         parts_used=excluded.parts_used, photos_before=excluded.photos_before, photos_after=excluded.photos_after,
         notes=excluded.notes, signature=excluded.signature, gps_lat=excluded.gps_lat, gps_lon=excluded.gps_lon,
         updated_at=excluded.updated_at, synced_at=excluded.synced_at`,
        [wo.id, wo.title, wo.description, wo.status, wo.priority, wo.assigned_to, wo.asset_id, wo.clock_in, wo.clock_out, JSON.stringify(wo.parts_used), JSON.stringify(wo.photos_before), JSON.stringify(wo.photos_after), wo.notes, wo.signature, wo.gps_lat, wo.gps_lon, wo.created_at, wo.updated_at, new Date().toISOString()]
      );
    }
    await db.runAsync('UPDATE sync_state SET last_pulled_at = ? WHERE id = 1', [new Date().toISOString()]);
  });
}

export async function pushPendingChanges(db: SQLiteDatabase, token: string) {
  const pending = await db.getAllAsync<any>('SELECT * FROM pending_changes ORDER BY id ASC LIMIT 50');
  if (pending.length === 0) return;

  const response = await fetch(`${API_BASE}/api/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ changes: pending }),
  });
  if (!response.ok) throw new Error('Push failed');
  const result = await response.json();

  await db.withTransactionAsync(async () => {
    for (const item of pending) {
      const conflict = result.conflicts?.find((c: any) => c.id === item.id);
      if (conflict) {
        await db.runAsync('UPDATE pending_changes SET retry_count = retry_count + 1 WHERE id = ?', [item.id]);
        continue;
      }
      await db.runAsync('DELETE FROM pending_changes WHERE id = ?', [item.id]);
    }
    await db.runAsync('UPDATE sync_state SET last_pushed_at = ? WHERE id = 1', [new Date().toISOString()]);
    const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM pending_changes');
    await db.runAsync('UPDATE sync_state SET pending_count = ? WHERE id = 1', [countRow?.count ?? 0]);
  });
}

export async function syncAll(db: SQLiteDatabase, token: string) {
  await db.runAsync('UPDATE sync_state SET is_syncing = 1 WHERE id = 1');
  try {
    await pushPendingChanges(db, token);
    await pullChanges(db, token);
  } finally {
    await db.runAsync('UPDATE sync_state SET is_syncing = 0 WHERE id = 1');
  }
}
