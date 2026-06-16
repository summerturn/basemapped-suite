import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  offlineMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
  setOfflineMode: (v: boolean) => void;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.aquamap.local';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  offlineMode: false,
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    await SecureStore.setItemAsync('jwt_token', data.token);
    await SecureStore.setItemAsync('user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token, isAuthenticated: true, offlineMode: false });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    await SecureStore.deleteItemAsync('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  loadAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('jwt_token');
      const userStr = await SecureStore.getItemAsync('user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });
      }
    } catch {
      // ignore
    } finally {
      set({ isLoading: false });
    }
  },
  setOfflineMode: (v) => set({ offlineMode: v }),
}));
