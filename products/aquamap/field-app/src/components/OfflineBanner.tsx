import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOffline } from '@/hooks/useOffline';

export function OfflineBanner() {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>You are offline. Changes will sync when connection is restored.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});
