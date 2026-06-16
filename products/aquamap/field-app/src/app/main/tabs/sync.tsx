import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useOffline } from '@/hooks/useOffline';
import { useAuthStore } from '@/stores/authStore';
import { syncAll, getSyncState, SyncState } from '@/services/sync/sync-service';

export default function SyncScreen() {
  const db = useSQLiteContext();
  const { isOffline } = useOffline();
  const token = useAuthStore((s) => s.token);
  const [state, setState] = useState<SyncState>({ lastPulledAt: null, lastPushedAt: null, isSyncing: false, pendingCount: 0 });
  const [autoSync, setAutoSync] = useState(true);
  const [message, setMessage] = useState('');

  const refreshState = useCallback(async () => {
    const s = await getSyncState(db);
    setState(s);
  }, [db]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const handleSync = async () => {
    if (!token) {
      setMessage('Not authenticated.');
      return;
    }
    setMessage('');
    try {
      await syncAll(db, token);
      setMessage('Sync completed successfully.');
    } catch (e: any) {
      setMessage(`Sync failed: ${e.message}`);
    } finally {
      await refreshState();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sync Status</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Connection</Text>
        <Text style={[styles.value, isOffline ? styles.danger : styles.success]}>{isOffline ? 'Offline' : 'Online'}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Last Pull</Text>
        <Text style={styles.value}>{state.lastPulledAt ? new Date(state.lastPulledAt).toLocaleString() : 'Never'}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Last Push</Text>
        <Text style={styles.value}>{state.lastPushedAt ? new Date(state.lastPushedAt).toLocaleString() : 'Never'}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Pending Changes</Text>
        <Text style={styles.value}>{state.pendingCount}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Auto Sync</Text>
        <Switch value={autoSync} onValueChange={setAutoSync} />
      </View>

      {state.isSyncing ? (
        <ActivityIndicator size="large" style={{ marginVertical: 20 }} />
      ) : (
        <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={isOffline}>
          <Text style={styles.syncBtnText}>Sync Now</Text>
        </TouchableOpacity>
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {state.pendingCount > 0 && (
        <View style={styles.conflictCard}>
          <Text style={styles.conflictTitle}>Pending Conflicts</Text>
          <Text style={styles.conflictSub}>Conflicts will be resolved server-side on next push.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  label: { fontSize: 16, color: '#374151' },
  value: { fontSize: 16, fontWeight: '600' },
  success: { color: '#059669' },
  danger: { color: '#dc2626' },
  syncBtn: { marginTop: 24, backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center' },
  syncBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  message: { marginTop: 16, textAlign: 'center', color: '#4b5563' },
  conflictCard: { marginTop: 24, padding: 16, backgroundColor: '#fffbeb', borderRadius: 8, borderLeftWidth: 4, borderColor: '#f59e0b' },
  conflictTitle: { fontWeight: 'bold', color: '#92400e', marginBottom: 4 },
  conflictSub: { color: '#b45309' },
});
