import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from 'react-native';
import type { LatLng } from 'react-native-maps';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export interface DrawingToolsProps {
  onPolygonComplete?: (coordinates: LatLng[]) => void;
  onPolygonUpdate?: (coordinates: LatLng[]) => void;
  editable?: boolean;
  initialCoordinates?: LatLng[];
}

export function DrawingTools({
  onPolygonComplete,
  onPolygonUpdate,
  editable = true,
  initialCoordinates = [],
}: DrawingToolsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [points, setPoints] = useState<LatLng[]>(initialCoordinates);
  const [activeVertexIndex, setActiveVertexIndex] = useState<number | null>(null);

  const addPoint = useCallback(
    (lat: number, lng: number) => {
      if (!editable) return;
      const next = [...points, { latitude: lat, longitude: lng }];
      setPoints(next);
      onPolygonUpdate?.(next);
    },
    [editable, points, onPolygonUpdate]
  );

  const undo = useCallback(() => {
    if (points.length === 0) return;
    const next = points.slice(0, -1);
    setPoints(next);
    onPolygonUpdate?.(next);
  }, [points, onPolygonUpdate]);

  const clear = useCallback(() => {
    setPoints([]);
    setActiveVertexIndex(null);
    onPolygonUpdate?.([]);
  }, [onPolygonUpdate]);

  const closePolygon = useCallback(() => {
    if (points.length < 3) {
      Alert.alert('Not enough points', 'A polygon requires at least 3 points.');
      return;
    }
    if (points[0].latitude !== points[points.length - 1].latitude ||
        points[0].longitude !== points[points.length - 1].longitude) {
      const closed = [...points, points[0]];
      setPoints(closed);
      onPolygonComplete?.(closed);
    } else {
      onPolygonComplete?.(points);
    }
  }, [points, onPolygonComplete]);

  const removeVertex = useCallback((index: number) => {
    if (points.length <= 3) {
      Alert.alert('Minimum vertices', 'A polygon must have at least 3 vertices.');
      return;
    }
    const next = points.filter((_, i) => i !== index);
    setPoints(next);
    setActiveVertexIndex(null);
    onPolygonUpdate?.(next);
  }, [points, onPolygonUpdate]);

  const areaSqFt = calculateAreaSqFt(points);

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      if (!editable) return;
      // Convert screen coordinates to lat/lng would require map projection;
      // here we expose a helper that parent calls with lat/lng instead.
    })
    .runOnJS(true);

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={styles.container} pointerEvents="box-none">
        {/* Info panel */}
        {points.length > 0 && (
          <View style={[styles.infoPanel, isDark && styles.infoPanelDark]}>
            <Text style={[styles.infoText, isDark && styles.textDark]}>
              Points: {points.length}
            </Text>
            {areaSqFt > 0 && (
              <Text style={[styles.infoText, isDark && styles.textDark]}>
                Area: {areaSqFt.toLocaleString(undefined, { maximumFractionDigits: 1 })} sq ft
              </Text>
            )}
          </View>
        )}

        {/* Toolbar */}
        {editable && (
          <View style={[styles.toolbar, isDark && styles.toolbarDark]}>
            <TouchableOpacity style={styles.toolButton} onPress={undo} disabled={points.length === 0}>
              <Text style={[styles.toolText, points.length === 0 && styles.toolTextDisabled]}>
                ↩ Undo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton} onPress={clear} disabled={points.length === 0}>
              <Text style={[styles.toolText, points.length === 0 && styles.toolTextDisabled]}>
                ✕ Clear
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton} onPress={closePolygon} disabled={points.length < 3}>
              <Text style={[styles.toolText, points.length < 3 && styles.toolTextDisabled]}>
                ✓ Close
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Vertex list for editing */}
        {editable && points.length > 0 && (
          <View style={[styles.vertexList, isDark && styles.vertexListDark]}>
            {points.map((pt, idx) => (
              <TouchableOpacity
                key={`${idx}-${pt.latitude}-${pt.longitude}`}
                style={[
                  styles.vertexItem,
                  activeVertexIndex === idx && styles.vertexItemActive,
                ]}
                onPress={() => setActiveVertexIndex(idx === activeVertexIndex ? null : idx)}
                onLongPress={() => removeVertex(idx)}
              >
                <Text style={[styles.vertexText, isDark && styles.textDark]}>
                  {idx + 1}: {pt.latitude.toFixed(6)}, {pt.longitude.toFixed(6)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

/**
 * Helper to add a geographic point from a map press.
 * Call this from parent when map is pressed in drawing mode.
 */
export function useDrawingTools() {
  const [coordinates, setCoordinates] = useState<LatLng[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = useCallback(() => {
    setCoordinates([]);
    setIsDrawing(true);
  }, []);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const addCoordinate = useCallback((lat: number, lng: number) => {
    if (!isDrawing) return;
    setCoordinates(prev => [...prev, { latitude: lat, longitude: lng }]);
  }, [isDrawing]);

  const removeLastCoordinate = useCallback(() => {
    setCoordinates(prev => prev.slice(0, -1));
  }, []);

  const clearCoordinates = useCallback(() => {
    setCoordinates([]);
  }, []);

  const areaSqFt = calculateAreaSqFt(coordinates);

  return {
    coordinates,
    isDrawing,
    startDrawing,
    stopDrawing,
    addCoordinate,
    removeLastCoordinate,
    clearCoordinates,
    areaSqFt,
  };
}

function calculateAreaSqFt(points: LatLng[]): number {
  if (points.length < 3) return 0;
  // Close polygon if not closed
  const pts = [...points];
  if (pts[0].latitude !== pts[pts.length - 1].latitude || pts[0].longitude !== pts[pts.length - 1].longitude) {
    pts.push(pts[0]);
  }

  // Shoelace formula on lat/lng is not area-accurate, but we convert degrees to meters roughly
  const metersPerDegLat = 111320;
  let area = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const avgLat = ((p1.latitude + p2.latitude) / 2) * (Math.PI / 180);
    const metersPerDegLng = 111320 * Math.cos(avgLat);
    area += (p1.longitude * metersPerDegLng) * (p2.latitude * metersPerDegLat)
          - (p2.longitude * metersPerDegLng) * (p1.latitude * metersPerDegLat);
  }
  area = Math.abs(area) / 2;

  // Convert sq meters to sq ft
  return area * 10.7639;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 16,
    pointerEvents: 'box-none',
  },
  infoPanel: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoPanelDark: {
    backgroundColor: 'rgba(30,30,30,0.9)',
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  textDark: {
    color: '#eee',
  },
  toolbar: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toolbarDark: {
    backgroundColor: 'rgba(40,40,40,0.95)',
  },
  toolButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  toolText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  toolTextDisabled: {
    color: '#aaa',
  },
  vertexList: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    maxHeight: 160,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vertexListDark: {
    backgroundColor: 'rgba(40,40,40,0.95)',
  },
  vertexItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  vertexItemActive: {
    backgroundColor: 'rgba(33,150,243,0.15)',
  },
  vertexText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
});
