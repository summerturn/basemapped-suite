import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { initDatabase } from '@/database/schema';
import { syncAll } from '@/services/sync/sync-service';
import NetInfo from '@react-native-community/netinfo';

function AuthGate({ children }: { children: React.ReactNode }) {
  const loadAuth = useAuthStore((s) => s.loadAuth);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

function SyncProvider() {
  const db = useSQLiteContext();
  const token = useAuthStore((s) => s.token);
  const [netOffline, setNetOffline] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setNetOffline(!(state.isConnected && state.isInternetReachable));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!db || !token || netOffline || !autoSync) return;
    const interval = setInterval(() => {
      syncAll(db, token).catch(() => {});
    }, 30000);
    syncAll(db, token).catch(() => {});
    return () => clearInterval(interval);
  }, [db, token, netOffline, autoSync]);

  return null;
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="aquamap.db" onInit={initDatabase}>
      <AuthGate>
        <SyncProvider />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="main" />
        </Stack>
      </AuthGate>
    </SQLiteProvider>
  );
}
