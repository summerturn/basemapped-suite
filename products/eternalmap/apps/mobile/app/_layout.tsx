import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { openDatabase, getDatabase } from '../src/services/database/connection';
import { migrate } from '../src/services/database/migrations';
import { RepositoryFactory } from '../src/services/database/repositories';
import { useAuthStore } from '../src/stores/authStore';
import { SyncEngine } from '../src/services/sync/SyncEngine';
import { createSyncApiClient } from '../src/services/sync/apiClient';
import { useLocation } from '../src/hooks/useLocation';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const { token, user } = useAuthStore();
  const { requestPermission } = useLocation();

  useEffect(() => {
    async function bootstrap() {
      try {
        // Open and migrate database
        openDatabase('eternalmap.db');
        const db = getDatabase();
        migrate(db);
        RepositoryFactory.getInstance(db);

        // Initialize sync engine (with mock API client for now)
        const apiClient = createSyncApiClient();
        const syncEngine = new SyncEngine({ db, apiClient });
        // Optionally trigger background sync
        // await syncEngine.sync();

        // Request location permission early
        await requestPermission();
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        setReady(true);
      }
    }
    bootstrap();
  }, [requestPermission]);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === 'auth';

    if (!token && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (token && inAuthGroup) {
      router.replace('/main/tabs/map');
    }
  }, [ready, token, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#fff' }}>
        <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="main" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Placeholder API client factory
function createSyncApiClient() {
  return {
    pullChanges: async ({ since }: { since: number }) => {
      // Replace with real Axios/fetch to your backend
      return { changes: [], hasMore: false };
    },
    pushChanges: async (changes: any[]) => {
      return { successIds: changes.map(c => c.id), failedIds: [], conflicts: [] };
    },
    resolveConflict: async () => {},
  };
}
