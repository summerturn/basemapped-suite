import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import NetInfo from '@react-native-community/netinfo';

export interface RegisterPayload {
  email: string;
  password: string;
  organization: {
    name: string;
    phone?: string;
  };
  cemetery: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
  };
}

export function useAuth() {
  const store = useAuthStore();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected && state.isInternetReachable));
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    store.setLoading(true);
    try {
      if (isOffline) {
        // Offline mode: rely on cached credentials handled in login screen
        store.setLoading(false);
        return false;
      }

      // Real API call placeholder
      const response = await mockApiLogin(email, password);
      if (response.success) {
        store.setUser(response.user);
        store.setToken(response.token);
        store.setTenant(response.tenant);
        return true;
      }
      return false;
    } catch (err) {
      store.setError((err as Error).message);
      return false;
    } finally {
      store.setLoading(false);
    }
  }, [isOffline, store]);

  const register = useCallback(async (payload: RegisterPayload): Promise<boolean> => {
    store.setLoading(true);
    try {
      if (isOffline) {
        throw new Error('Registration requires an internet connection.');
      }
      const response = await mockApiRegister(payload);
      if (response.success) {
        store.setUser(response.user);
        store.setToken(response.token);
        store.setTenant(response.tenant);
        return true;
      }
      return false;
    } catch (err) {
      store.setError((err as Error).message);
      return false;
    } finally {
      store.setLoading(false);
    }
  }, [isOffline, store]);

  const logout = useCallback(async () => {
    store.clear();
  }, [store]);

  return {
    user: store.user,
    token: store.token,
    tenant: store.tenant,
    loading: store.loading,
    error: store.error,
    isOffline,
    login,
    register,
    logout,
  };
}

// Mock API placeholders — replace with real axios/fetch calls
async function mockApiLogin(email: string, password: string): Promise<{ success: boolean; token: string; user: any; tenant: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        token: 'mock-jwt-token',
        user: { id: 'u1', email },
        tenant: 'tenant-1',
      });
    }, 800);
  });
}

async function mockApiRegister(_payload: RegisterPayload): Promise<{ success: boolean; token: string; user: any; tenant: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        token: 'mock-jwt-token',
        user: { id: 'u2', email: _payload.email },
        tenant: 'tenant-1',
      });
    }, 1000);
  });
}
