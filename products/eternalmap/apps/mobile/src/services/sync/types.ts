export type SyncStatusValue = 'synced' | 'pending' | 'conflict' | 'error';
export type SyncOperationType = 'INSERT' | 'UPDATE' | 'DELETE';
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ConflictResolutionStrategy = 'server-wins' | 'local-wins' | 'merge' | 'manual';

export interface SyncOperation {
  id?: number;
  tableName: string;
  recordId: string;
  operation: SyncOperationType;
  data: Record<string, unknown>;
  status: QueueStatus;
  retryCount: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SyncChange {
  id: string;
  tableName: string;
  operation: SyncOperationType;
  data: Record<string, unknown>;
  serverVersion: number;
  serverModifiedAt: number;
  deletedAt?: number | null;
}

export interface ConflictRecord {
  id: string;
  tableName: string;
  recordId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localVersion: number;
  serverVersion: number;
  localModifiedAt: number;
  serverModifiedAt: number;
  strategy: ConflictResolutionStrategy;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface SyncStatus {
  lastSyncTimestamp: number;
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  errorCount: number;
  totalQueueCount: number;
  isOnline: boolean;
}

export interface SyncOptions {
  force?: boolean;
  tables?: string[];
  batchSize?: number;
  conflictStrategy?: ConflictResolutionStrategy;
}

export interface PullResult {
  changes: SyncChange[];
  hasMore: boolean;
  cursor?: string;
}

export interface PushResult {
  successIds: string[];
  failedIds: { id: string; error: string }[];
  conflicts: ConflictRecord[];
}

export interface SyncApiClient {
  pullChanges: (params: { since: number; tables?: string[]; cursor?: string; limit?: number }) => Promise<PullResult>;
  pushChanges: (changes: SyncChange[]) => Promise<PushResult>;
  resolveConflict: (conflictId: string, resolution: ConflictResolutionStrategy, data?: Record<string, unknown>) => Promise<void>;
}

export interface SyncEngineConfig {
  db: import('@op-engineering/op-sqlite').DB;
  apiClient: SyncApiClient;
  conflictStrategy?: ConflictResolutionStrategy;
  batchSize?: number;
  retryLimit?: number;
}
