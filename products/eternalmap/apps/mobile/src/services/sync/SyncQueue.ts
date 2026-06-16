import { type DB } from '@op-engineering/op-sqlite';
import { type SyncOperation, type SyncOperationType, type QueueStatus } from './types';

export class SyncQueue {
  constructor(private db: DB) {}

  enqueue(tableName: string, recordId: string, operation: SyncOperationType, data: Record<string, unknown>): SyncOperation {
    const now = Date.now();
    const dataJson = JSON.stringify(data);

    // Upsert: if pending record exists for same table+id+operation, update data; otherwise insert
    const existing = this.db.execute(
      `SELECT id FROM sync_queue
       WHERE table_name = ? AND record_id = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [tableName, recordId]
    );

    if (existing.rows.length > 0) {
      const id = (existing.rows.item(0) as { id: number }).id;
      this.db.execute(
        `UPDATE sync_queue
         SET operation = ?, data_json = ?, updated_at = ?, retry_count = 0, error_message = NULL, status = 'pending'
         WHERE id = ?`,
        [operation, dataJson, now, id]
      );
      return {
        id,
        tableName,
        recordId,
        operation,
        data,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      };
    }

    this.db.execute(
      `INSERT INTO sync_queue (table_name, record_id, operation, data_json, status, retry_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tableName, recordId, operation, dataJson, 'pending', 0, now, now]
    );

    // Get last inserted id
    const lastIdResult = this.db.execute('SELECT last_insert_rowid() as id');
    const insertedId = (lastIdResult.rows.item(0) as { id: number }).id;

    return {
      id: insertedId,
      tableName,
      recordId,
      operation,
      data,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  dequeue(batchSize: number = 50): SyncOperation[] {
    const result = this.db.execute(
      `SELECT * FROM sync_queue
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT ?`,
      [batchSize]
    );
    return this.mapRows(result.rows);
  }

  getPending(): SyncOperation[] {
    return this.dequeue(1000);
  }

  getFailed(): SyncOperation[] {
    const result = this.db.execute(
      `SELECT * FROM sync_queue WHERE status = 'failed' ORDER BY updated_at ASC`
    );
    return this.mapRows(result.rows);
  }

  markProcessing(id: number): void {
    this.db.execute(
      `UPDATE sync_queue SET status = 'processing', updated_at = ? WHERE id = ?`,
      [Date.now(), id]
    );
  }

  markCompleted(id: number): void {
    this.db.execute(
      `UPDATE sync_queue SET status = 'completed', updated_at = ? WHERE id = ?`,
      [Date.now(), id]
    );
  }

  markFailed(id: number, errorMessage: string): void {
    const now = Date.now();
    this.db.execute(
      `UPDATE sync_queue SET status = 'failed', error_message = ?, retry_count = retry_count + 1, updated_at = ? WHERE id = ?`,
      [errorMessage, now, id]
    );
  }

  clearCompleted(beforeTimestamp?: number): number {
    const ts = beforeTimestamp ?? Date.now() - 24 * 60 * 60 * 1000; // default 24h ago
    this.db.execute(
      `DELETE FROM sync_queue WHERE status = 'completed' AND updated_at < ?`,
      [ts]
    );
    return this.db.getRowsModified();
  }

  retryFailed(maxRetries: number = 5): number {
    const result = this.db.execute(
      `UPDATE sync_queue
       SET status = 'pending', retry_count = retry_count + 1, updated_at = ?, error_message = NULL
       WHERE status = 'failed' AND retry_count < ?`,
      [Date.now(), maxRetries]
    );
    return this.db.getRowsModified();
  }

  getStats(): { pending: number; processing: number; completed: number; failed: number } {
    const result = this.db.execute(
      `SELECT status, COUNT(*) as cnt FROM sync_queue GROUP BY status`
    );
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i) as { status: QueueStatus; cnt: number };
      if (row.status in stats) {
        stats[row.status] = row.cnt;
      }
    }
    return stats;
  }

  private mapRows(rows: { length: number; item: (index: number) => Record<string, unknown> }): SyncOperation[] {
    const out: SyncOperation[] = [];
    for (let i = 0; i < rows.length; i++) {
      out.push(this.mapRow(rows.item(i)));
    }
    return out;
  }

  private mapRow(row: Record<string, unknown>): SyncOperation {
    return {
      id: row.id as number,
      tableName: row.table_name as string,
      recordId: row.record_id as string,
      operation: row.operation as SyncOperationType,
      data: JSON.parse(row.data_json as string) as Record<string, unknown>,
      status: row.status as QueueStatus,
      retryCount: row.retry_count as number,
      errorMessage: row.error_message as string | undefined,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }
}
