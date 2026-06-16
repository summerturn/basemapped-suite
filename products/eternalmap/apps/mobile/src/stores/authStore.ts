import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface Tenant {
  id: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenant: null,
      loading: false,
      error: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setTenant: (tenant) => set({ tenant }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clear: () => set({ token: null, user: null, tenant: null, error: null, loading: false }),
    }),
    {
      name: 'eternalmap-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        tenant: state.tenant,
      }),
    }
  )
);
