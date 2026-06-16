import type { SyncApiClient, PullResult, PushResult } from './types';

/**
 * Factory to create the real sync API client.
 * Replace the mock implementations with actual axios/fetch calls to your backend.
 */
export function createSyncApiClient(baseURL?: string): SyncApiClient {
  const _base = baseURL ?? process.env.EXPO_PUBLIC_API_URL ?? 'https://api.eternalmap.example';

  return {
    async pullChanges({ since, tables, cursor, limit }): Promise<PullResult> {
      // TODO: implement real API call
      // const { data } = await axios.get(`${_base}/sync/pull`, { params: { since, tables, cursor, limit } });
      console.log('[SyncApiClient] pullChanges', { since, tables, cursor, limit });
      return { changes: [], hasMore: false };
    },

    async pushChanges(changes): Promise<PushResult> {
      // TODO: implement real API call
      // const { data } = await axios.post(`${_base}/sync/push`, { changes });
      console.log('[SyncApiClient] pushChanges', changes.length);
      return {
        successIds: changes.map(c => c.id),
        failedIds: [],
        conflicts: [],
      };
    },

    async resolveConflict(conflictId, resolution, data) {
      // TODO: implement real API call
      console.log('[SyncApiClient] resolveConflict', { conflictId, resolution, data });
    },
  };
}
