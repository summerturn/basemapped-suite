import { type DB } from '@op-engineering/op-sqlite';
import {
  type SyncApiClient,
  type SyncOptions,
  type SyncStatus,
  type SyncChange,
  type ConflictRecord,
  type ConflictResolutionStrategy,
  type PullResult,
  type PushResult,
} from './types';
import { SyncQueue } from './SyncQueue';
import { ConflictResolver, NeedsResolution } from './ConflictResolver';

export class SyncEngine {
  private db: DB;
  private apiClient: SyncApiClient;
  private queue: SyncQueue;
  private conflictStrategy: ConflictResolutionStrategy;
  private batchSize: number;
  private retryLimit: number;
  private _isSyncing = false;
  private _lastSyncTimestamp = 0;
  private _conflicts: ConflictRecord[] = [];

  constructor(config: {
    db: DB;
    apiClient: SyncApiClient;
    conflictStrategy?: ConflictResolutionStrategy;
    batchSize?: number;
    retryLimit?: number;
  }) {
    this.db = config.db;
    this.apiClient = config.apiClient;
    this.queue = new SyncQueue(config.db);
    this.conflictStrategy = config.conflictStrategy ?? 'server-wins';
    this.batchSize = config.batchSize ?? 100;
    this.retryLimit = config.retryLimit ?? 5;
    this.loadLastSyncTimestamp();
  }

  initialize(db: DB, apiClient: SyncApiClient): void {
    this.db = db;
    this.apiClient = apiClient;
    this.queue = new SyncQueue(db);
    this.loadLastSyncTimestamp();
  }

  private loadLastSyncTimestamp(): void {
    try {
      const result = this.db.execute("SELECT value FROM app_settings WHERE key = 'last_sync_timestamp'");
      if (result.rows.length > 0) {
        this._lastSyncTimestamp = Number((result.rows.item(0) as { value: string }).value) || 0;
      }
    } catch {
      this._lastSyncTimestamp = 0;
    }
  }

  private saveLastSyncTimestamp(ts: number): void {
    this._lastSyncTimestamp = ts;
    this.db.execute(
      "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('last_sync_timestamp', ?, ?)",
      [String(ts), Date.now()]
    );
  }

  async sync(options?: SyncOptions): Promise<SyncStatus> {
    if (this._isSyncing) {
      return this.getSyncStatus();
    }

    this._isSyncing = true;
    const startTime = Date.now();

    try {
      // 1. Start SQLite transaction for the entire sync
      this.db.execute('BEGIN EXCLUSIVE TRANSACTION;');

      // 2. Pull server changes first
      const pullResult = await this.pullChanges(this._lastSyncTimestamp, options);

      // 3. Apply server changes, detecting conflicts
      const serverConflicts = await this.applyServerChanges(pullResult.changes, options);
      this._conflicts.push(...serverConflicts);

      // 4. Push local pending changes
      const pushResult = await this.pushChanges(options);

      // 5. Store push-side conflicts
      if (pushResult.conflicts.length > 0) {
        this._conflicts.push(...pushResult.conflicts);
      }

      // 6. Update last sync timestamp
      this.saveLastSyncTimestamp(startTime);

      // 7. Commit transaction
      this.db.execute('COMMIT;');

      // 8. Clear old completed queue items
      this.queue.clearCompleted();

      return this.getSyncStatus();
    } catch (error) {
      // Rollback on any error
      try {
        this.db.execute('ROLLBACK;');
      } catch {
        // ignore rollback errors
      }

      // If the error was a network issue, local changes remain queued for retry
      if (this.isNetworkError(error)) {
        this.queue.retryFailed();
      }

      throw error;
    } finally {
      this._isSyncing = false;
    }
  }

  async pullChanges(since: number, options?: SyncOptions): Promise<PullResult> {
    try {
      const result = await this.apiClient.pullChanges({
        since,
        tables: options?.tables,
        limit: options?.batchSize ?? this.batchSize,
      });
      return result;
    } catch (error) {
      // If offline, return empty changes
      if (this.isNetworkError(error)) {
        return { changes: [], hasMore: false };
      }
      throw error;
    }
  }

  private async applyServerChanges(changes: SyncChange[], options?: SyncOptions): Promise<ConflictRecord[]> {
    const conflicts: ConflictRecord[] = [];
    const strategy = options?.conflictStrategy ?? this.conflictStrategy;

    for (const change of changes) {
      // Check if local pending change exists for same record
      const localPending = this.db.execute(
        'SELECT * FROM sync_queue WHERE table_name = ? AND record_id = ? AND status IN ("pending", "processing")',
        [change.tableName, change.id]
      );

      const hasLocalPending = localPending.rows.length > 0;

      // Fetch local record if exists
      const localRecord = this.db.execute(
        `SELECT * FROM ${change.tableName} WHERE id = ?`,
        [change.id]
      );
      const localExists = localRecord.rows.length > 0;
      const localData = localExists ? (localRecord.rows.item(0) as Record<string, unknown>) : {};
      const localVersion = (localData._sync_version as number) ?? 0;
      const localModifiedAt = (localData._local_modified_at as number) ?? 0;

      // Conflict detection: both sides modified same record
      if (hasLocalPending && localExists) {
        const conflict = ConflictResolver.createConflict(
          change.tableName,
          change.id,
          localData,
          change.data,
          localVersion,
          change.serverVersion,
          localModifiedAt,
          change.serverModifiedAt,
          strategy
        );

        if (strategy === 'manual') {
          conflicts.push(conflict);
          continue;
        }

        try {
          const resolution = ConflictResolver.resolve(conflict, strategy);
          this.applyChange(change.tableName, change.id, change.operation, resolution.data, resolution.version);
        } catch (err) {
          if (err instanceof NeedsResolution) {
            conflicts.push(conflict);
          } else {
            throw err;
          }
        }
        continue;
      }

      // No conflict: apply server change directly
      this.applyChange(change.tableName, change.id, change.operation, change.data, change.serverVersion);

      // Handle tombstone (soft delete)
      if (change.deletedAt) {
        this.db.execute(
          `UPDATE ${change.tableName} SET deleted_at = ?, _sync_status = 'synced', _sync_version = ? WHERE id = ?`,
          [change.deletedAt, change.serverVersion, change.id]
        );
      }
    }

    return conflicts;
  }

  private applyChange(tableName: string, id: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', data: Record<string, unknown>, version: number): void {
    if (operation === 'DELETE') {
      this.db.execute(
        `UPDATE ${tableName} SET deleted_at = ?, _sync_status = 'synced', _sync_version = ? WHERE id = ?`,
        [Date.now(), version, id]
      );
      return;
    }

    const snakeData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      snakeData[this.toSnakeCase(key)] = value;
    }

    // Check if record exists
    const existing = this.db.execute(`SELECT 1 as e FROM ${tableName} WHERE id = ?`, [id]);
    const exists = existing.rows.length > 0;

    if (operation === 'INSERT' || !exists) {
      const columns = Object.keys(snakeData);
      const placeholders = columns.map(() => '?').join(', ');
      this.db.execute(
        `INSERT OR REPLACE INTO ${tableName} (id, ${columns.join(', ')}, _sync_status, _sync_version) VALUES (?, ${placeholders}, 'synced', ?)`,
        [id, ...Object.values(snakeData), version]
      );
    } else {
      const columns = Object.keys(snakeData);
      const setClause = columns.map(c => `${c} = ?`).join(', ');
      this.db.execute(
        `UPDATE ${tableName} SET ${setClause}, _sync_status = 'synced', _sync_version = ? WHERE id = ?`,
        [...Object.values(snakeData), version, id]
      );
    }
  }

  async pushChanges(options?: SyncOptions): Promise<PushResult> {
    const pending = this.queue.dequeue(options?.batchSize ?? this.batchSize);
    if (pending.length === 0) {
      return { successIds: [], failedIds: [], conflicts: [] };
    }

    const changes: SyncChange[] = pending.map(op => ({
      id: op.recordId,
      tableName: op.tableName,
      operation: op.operation,
      data: op.data,
      serverVersion: 0,
      serverModifiedAt: 0,
    }));

    // Mark as processing
    for (const op of pending) {
      this.queue.markProcessing(op.id!);
    }

    try {
      const result = await this.apiClient.pushChanges(changes);

      // Mark successes
      for (const successId of result.successIds) {
        const op = pending.find(p => p.recordId === successId);
        if (op) this.queue.markCompleted(op.id!);
      }

      // Mark failures
      for (const fail of result.failedIds) {
        const op = pending.find(p => p.recordId === fail.id);
        if (op) this.queue.markFailed(op.id!, fail.error);
      }

      return result;
    } catch (error) {
      // Mark all as failed
      for (const op of pending) {
        this.queue.markFailed(op.id!, (error as Error).message);
      }

      if (this.isNetworkError(error)) {
        return { successIds: [], failedIds: pending.map(p => ({ id: p.recordId, error: 'Network error' })), conflicts: [] };
      }
      throw error;
    }
  }

  resolveConflict(conflictId: string, resolution: ConflictResolutionStrategy, mergedData?: Record<string, unknown>): void {
    const conflict = this._conflicts.find(c => c.id === conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found.`);
    }

    let resolved: { data: Record<string, unknown>; version: number };

    if (resolution === 'merge' && mergedData) {
      resolved = {
        data: mergedData,
        version: Math.max(conflict.serverVersion, conflict.localVersion) + 1,
      };
    } else {
      const result = ConflictResolver.resolve(conflict, resolution);
      resolved = { data: result.data, version: result.version };
    }

    // Apply resolved data locally
    this.db.execute('BEGIN TRANSACTION;');
    try {
      this.applyChange(conflict.tableName, conflict.recordId, 'UPDATE', resolved.data, resolved.version);

      // Remove conflict from list
      this._conflicts = this._conflicts.filter(c => c.id !== conflictId);

      // Re-queue the local change for push so server gets the resolution
      this.queue.enqueue(conflict.tableName, conflict.recordId, 'UPDATE', resolved.data);

      this.db.execute('COMMIT;');
    } catch (error) {
      this.db.execute('ROLLBACK;');
      throw error;
    }
  }

  getSyncStatus(): SyncStatus {
    const stats = this.queue.getStats();
    return {
      lastSyncTimestamp: this._lastSyncTimestamp,
      isSyncing: this._isSyncing,
      pendingCount: stats.pending + stats.processing,
      conflictCount: this._conflicts.length,
      errorCount: stats.failed,
      totalQueueCount: stats.pending + stats.processing + stats.completed + stats.failed,
      isOnline: true, // TODO: integrate with NetInfo
    };
  }

  getConflicts(): ConflictRecord[] {
    return [...this._conflicts];
  }

  private isNetworkError(error: unknown): boolean {
    if (!error) return false;
    const msg = (error as Error).message?.toLowerCase() ?? '';
    return (
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('timeout') ||
      msg.includes('internet') ||
      msg.includes('offline') ||
      msg.includes('econnrefused') ||
      msg.includes('ENOTFOUND')
    );
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
