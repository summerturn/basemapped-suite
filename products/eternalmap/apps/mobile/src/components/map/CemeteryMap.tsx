import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Alert,
} from 'react-native';
import MapView, { Polygon, Marker, Circle, UrlTile, MAP_TYPES } from 'react-native-maps';
import type { Region, LatLng, MapPressEvent } from 'react-native-maps';
import { useLocation } from '../../hooks/useLocation';

export interface MapBoundary {
  id: string;
  coordinates: LatLng[];
  fillColor?: string;
  strokeColor?: string;
}

export interface PlotOverlay {
  id: string;
  coordinates: LatLng[];
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'unavailable';
  plotNumber: string;
  sectionName?: string;
}

export interface GravePinData {
  id: string;
  coordinate: LatLng;
  title: string;
  status: string;
}

interface CemeteryMapProps {
  initialRegion: Region;
  boundaries?: MapBoundary[];
  plots?: PlotOverlay[];
  graves?: GravePinData[];
  onPlotPress?: (plot: PlotOverlay) => void;
  onGravePress?: (grave: GravePinData) => void;
  onMapPress?: (coordinate: LatLng) => void;
  onRegionChangeComplete?: (region: Region) => void;
  loading?: boolean;
}

const STATUS_COLORS = {
  available: '#4CAF50',
  occupied: '#F44336',
  reserved: '#FFC107',
  maintenance: '#9E9E9E',
  unavailable: '#000000',
};

const STATUS_COLORS_DARK = {
  available: '#66BB6A',
  occupied: '#EF5350',
  reserved: '#FFCA28',
  maintenance: '#BDBDBD',
  unavailable: '#424242',
};

export function CemeteryMap({
  initialRegion,
  boundaries = [],
  plots = [],
  graves = [],
  onPlotPress,
  onGravePress,
  onMapPress,
  onRegionChangeComplete,
  loading = false,
}: CemeteryMapProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const mapRef = useRef<MapView>(null);
  const { position, requestPermission, centerOnMe } = useLocation();
  const [mapType, setMapType] = useState<'satellite' | 'standard'>('satellite');
  const [selectedGraveId, setSelectedGraveId] = useState<string | null>(null);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const handleCenterOnMe = useCallback(async () => {
    try {
      const coords = await centerOnMe();
      if (coords && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.001,
            longitudeDelta: 0.001,
          },
          500
        );
      }
    } catch {
      Alert.alert('Location Error', 'Unable to get current location.');
    }
  }, [centerOnMe]);

  const handleMapPress = useCallback(
    (event: MapPressEvent) => {
      setSelectedGraveId(null);
      onMapPress?.(event.nativeEvent.coordinate);
    },
    [onMapPress]
  );

  const toggleMapType = useCallback(() => {
    setMapType(prev => (prev === 'satellite' ? 'standard' : 'satellite'));
  }, []);

  const statusColors = isDark ? STATUS_COLORS_DARK : STATUS_COLORS;

  if (loading) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapType={mapType === 'satellite' ? MAP_TYPES.SATELLITE : MAP_TYPES.STANDARD}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        showsScale
        rotateEnabled
        scrollEnabled
        pitchEnabled
        zoomEnabled
        onPress={handleMapPress}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {/* Offline tile caching hint — URL tile for overlay when offline bundle unavailable */}
        {mapType === 'standard' && (
          <UrlTile
            urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
            tileCachePath="{z}/{x}/{y}"
            tileCacheMaxAge={86400 * 30}
          />
        )}

        {/* Cemetery boundaries */}
        {boundaries.map(boundary => (
          <Polygon
            key={boundary.id}
            coordinates={boundary.coordinates}
            fillColor={boundary.fillColor ?? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')}
            strokeColor={boundary.strokeColor ?? (isDark ? '#fff' : '#000')}
            strokeWidth={2}
          />
        ))}

        {/* Section / Plot polygons */}
        {plots.map(plot => (
          <Polygon
            key={plot.id}
            coordinates={plot.coordinates}
            fillColor={`${statusColors[plot.status]}40`}
            strokeColor={statusColors[plot.status]}
            strokeWidth={1}
            tappable
            onPress={() => onPlotPress?.(plot)}
          />
        ))}

        {/* Grave pins */}
        {graves.map(grave => (
          <Marker
            key={grave.id}
            coordinate={grave.coordinate}
            title={grave.title}
            pinColor={selectedGraveId === grave.id ? '#2196F3' : '#607D8B'}
            onPress={() => {
              setSelectedGraveId(grave.id);
              onGravePress?.(grave);
            }}
          />
        ))}

        {/* User location accuracy circle */}
        {position?.coords.accuracy && (
          <Circle
            center={{
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }}
            radius={position.coords.accuracy}
            fillColor="rgba(33, 150, 243, 0.15)"
            strokeColor="rgba(33, 150, 243, 0.4)"
            strokeWidth={1}
          />
        )}
      </MapView>

      {/* Map type toggle */}
      <TouchableOpacity
        style={[styles.button, styles.mapTypeButton, isDark && styles.buttonDark]}
        onPress={toggleMapType}
        activeOpacity={0.8}
      >
        <View style={styles.iconPlaceholder}>
          <View style={styles.iconText}>{mapType === 'satellite' ? '🛰️' : '🗺️'}</View>
        </View>
      </TouchableOpacity>

      {/* Center on me */}
      <TouchableOpacity
        style={[styles.button, styles.centerButton, isDark && styles.buttonDark]}
        onPress={handleCenterOnMe}
        activeOpacity={0.8}
      >
        <View style={styles.iconPlaceholder}>
          <View style={styles.iconText}>📍</View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  button: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDark: {
    backgroundColor: '#2c2c2c',
  },
  mapTypeButton: {
    bottom: 80,
  },
  centerButton: {
    bottom: 16,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
  },
});
