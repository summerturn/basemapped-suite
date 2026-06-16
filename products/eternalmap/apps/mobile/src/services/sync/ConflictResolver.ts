import { type ConflictRecord, type ConflictResolutionStrategy } from './types';

export type ResolutionResult = {
  winner: 'server' | 'local' | 'merged';
  data: Record<string, unknown>;
  version: number;
};

export class ConflictResolver {
  /**
   * Server wins unconditionally.
   */
  static serverWins(conflict: ConflictRecord): ResolutionResult {
    return {
      winner: 'server',
      data: conflict.serverData,
      version: conflict.serverVersion,
    };
  }

  /**
   * Local wins unconditionally.
   */
  static localWins(conflict: ConflictRecord): ResolutionResult {
    return {
      winner: 'local',
      data: conflict.localData,
      version: conflict.localVersion + 1,
    };
  }

  /**
   * Attempt a shallow merge:
   * - For scalar fields: use the most recent timestamp (serverModifiedAt vs localModifiedAt)
   * - For arrays/objects: prefer server, but can be customized
   * - deleted_at is special: if either side has a soft-delete, preserve it
   */
  static merge(conflict: ConflictRecord): ResolutionResult {
    const merged: Record<string, unknown> = {};
    const allKeys = new Set([
      ...Object.keys(conflict.serverData),
      ...Object.keys(conflict.localData),
    ]);

    for (const key of allKeys) {
      const serverValue = conflict.serverData[key];
      const localValue = conflict.localData[key];

      // Prefer server for undefined local
      if (localValue === undefined) {
        merged[key] = serverValue;
        continue;
      }
      // Prefer local for undefined server
      if (serverValue === undefined) {
        merged[key] = localValue;
        continue;
      }

      // Timestamp fields: pick whichever side is newer
      if (
        (key === 'updated_at' || key === '_local_modified_at') &&
        typeof serverValue === 'number' &&
        typeof localValue === 'number'
      ) {
        merged[key] = Math.max(serverValue, localValue);
        continue;
      }

      // deleted_at handling
      if (key === 'deleted_at') {
        if (serverValue !== null || localValue !== null) {
          merged[key] = serverValue ?? localValue;
        } else {
          merged[key] = null;
        }
        continue;
      }

      // Default: newer wins
      if (conflict.serverModifiedAt >= conflict.localModifiedAt) {
        merged[key] = serverValue;
      } else {
        merged[key] = localValue;
      }
    }

    return {
      winner: 'merged',
      data: merged,
      version: Math.max(conflict.serverVersion, conflict.localVersion) + 1,
    };
  }

  /**
   * Build a ConflictRecord from local and server change representations.
   */
  static createConflict(
    tableName: string,
    recordId: string,
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>,
    localVersion: number,
    serverVersion: number,
    localModifiedAt: number,
    serverModifiedAt: number,
    strategy: ConflictResolutionStrategy = 'manual'
  ): ConflictRecord {
    return {
      id: `${tableName}:${recordId}:${Date.now()}`,
      tableName,
      recordId,
      localData,
      serverData,
      localVersion,
      serverVersion,
      localModifiedAt,
      serverModifiedAt,
      strategy,
    };
  }

  /**
   * Apply a strategy to resolve a conflict.
   */
  static resolve(conflict: ConflictRecord, strategy: ConflictResolutionStrategy): ResolutionResult {
    switch (strategy) {
      case 'server-wins':
        return ConflictResolver.serverWins(conflict);
      case 'local-wins':
        return ConflictResolver.localWins(conflict);
      case 'merge':
        return ConflictResolver.merge(conflict);
      case 'manual':
      default:
        throw new Error(`Conflict ${conflict.id} requires manual resolution.`);
    }
  }
}

export class NeedsResolution extends Error {
  constructor(public readonly conflict: ConflictRecord) {
    super(`Conflict detected on ${conflict.tableName}:${conflict.recordId}`);
    this.name = 'NeedsResolution';
  }
}
