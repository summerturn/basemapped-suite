import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import type { Asset } from '@/database/schema';

interface AssetMarkerProps {
  asset: Asset;
  onPress?: (asset: Asset) => void;
}

const ASSET_TYPE_COLORS: Record<string, string> = {
  hydrant: '#ef4444',
  valve: '#3b82f6',
  meter: '#10b981',
  main: '#6366f1',
  pump: '#f59e0b',
  tank: '#8b5cf6',
  treatment: '#06b6d4',
  other: '#6b7280',
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  hydrant: 'Hydrant',
  valve: 'Valve',
  meter: 'Meter',
  main: 'Main',
  pump: 'Pump',
  tank: 'Tank',
  treatment: 'Treatment',
  other: 'Other',
};

export function AssetMarker({ asset, onPress }: AssetMarkerProps) {
  const color = ASSET_TYPE_COLORS[asset.asset_type] ?? '#6b7280';
  let coordinates: { latitude: number; longitude: number } | null = null;

  try {
    const geometry = JSON.parse(asset.geometry_json);
    if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
      coordinates = {
        longitude: geometry.coordinates[0],
        latitude: geometry.coordinates[1],
      };
    }
  } catch {
    return null;
  }

  if (!coordinates) return null;

  const attributes = (() => {
    try {
      return JSON.parse(asset.attributes_json);
    } catch {
      return {};
    }
  })();

  return (
    <Marker
      coordinate={coordinates}
      pinColor={color}
      onPress={() => onPress?.(asset)}
    >
      <View style={[styles.markerDot, { backgroundColor: color }]} />
      <Callout>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>
            {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
          </Text>
          <Text style={styles.calloutText}>ID: {asset.id}</Text>
          {attributes.name && (
            <Text style={styles.calloutText}>Name: {attributes.name}</Text>
          )}
          <Text style={styles.calloutText}>Status: {asset.status}</Text>
          {asset.condition_rating && (
            <Text style={styles.calloutText}>
              Condition: {asset.condition_rating}/5
            </Text>
          )}
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  callout: {
    width: 200,
    padding: 8,
  },
  calloutTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 12,
    color: '#374151',
  },
});
