import { create } from 'zustand';

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSync: string | null;
  syncInProgress: boolean;
  setOnline: (online: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSync: (time: string) => void;
  setSyncInProgress: (progress: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,
  pendingCount: 0,
  lastSync: null,
  syncInProgress: false,
  setOnline: (online) => set({ isOnline: online }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSync: (time) => set({ lastSync: time }),
  setSyncInProgress: (progress) => set({ syncInProgress: progress }),
}));
