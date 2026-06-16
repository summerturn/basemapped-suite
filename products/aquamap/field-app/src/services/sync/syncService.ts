import { SQLiteDatabase } from 'expo-sqlite';
import api from '../api/client';

export async function syncPendingChanges(db: SQLiteDatabase) {
  const pending = await db.getAllAsync<{ id: number; table_name: string; row_id: string; operation: string; data_json: string }>(
    'SELECT * FROM pending_changes ORDER BY created_at LIMIT 50'
  );

  if (pending.length === 0) return;

  const changes = pending.map((p) => ({
    table: p.table_name,
    operation: p.operation,
    rowId: p.row_id,
    data: JSON.parse(p.data_json),
    clientTimestamp: new Date().toISOString(),
  }));

  try {
    const res = await api.post('/api/v1/sync/push', { changes });
    const results = res.data.data.results;

    const ackIds = pending.filter((_, i) => results[i]?.status === 'ack').map((p) => p.id);
    if (ackIds.length > 0) {
      await db.runAsync(`DELETE FROM pending_changes WHERE id IN (${ackIds.join(',')})`);
    }
  } catch (err) {
    console.error('Sync failed:', err);
    throw err;
  }
}
