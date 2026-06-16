'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapContainerProps {
  mapId: string;
  pointCount: number;
  onMapLoad?: (map: maplibregl.Map) => void;
}

export default function MapContainer({ mapId, pointCount, onMapLoad }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      const m = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            protomaps: {
              type: 'vector',
              url: process.env.NEXT_PUBLIC_PM_URL || 'https://api.protomaps.com/tiles/v3.json?key=YOUR_KEY',
            },
          },
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: { 'background-color': '#f8f9fa' },
            },
            {
              id: 'water',
              type: 'fill',
              source: 'protomaps',
              'source-layer': 'water',
              paint: { 'fill-color': '#a8d5f0' },
            },
            {
              id: 'landuse',
              type: 'fill',
              source: 'protomaps',
              'source-layer': 'landuse',
              paint: { 'fill-color': '#e8f5e9' },
            },
            {
              id: 'roads',
              type: 'line',
              source: 'protomaps',
              'source-layer': 'roads',
              paint: { 'line-color': '#ffffff', 'line-width': 1.5 },
            },
            {
              id: 'buildings',
              type: 'fill',
              source: 'protomaps',
              'source-layer': 'buildings',
              paint: { 'fill-color': '#e0e0e0' },
            },
          ],
        },
        center: [0, 20],
        zoom: 2,
        attributionControl: false,
      });

      m.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      m.addControl(new maplibregl.NavigationControl(), 'top-right');
      m.addControl(new maplibregl.FullscreenControl(), 'top-right');

      m.on('load', () => {
        setIsLoading(false);
        onMapLoad?.(m);
      });

      m.on('error', (e) => {
        setError(e.error?.message || 'Map error');
        setIsLoading(false);
      });

      map.current = m;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize map');
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapId, onMapLoad]);

  // Add data source based on point count
  useEffect(() => {
    if (!map.current || isLoading) return;

    const m = map.current;

    // Small dataset: GeoJSON direct
    if (pointCount < 5000) {
      fetch(`/api/maps/${mapId}/points`)
        .then((r) => r.json())
        .then((data) => {
          if (m.getSource('points')) {
            (m.getSource('points') as maplibregl.GeoJSONSource).setData(data);
          } else {
            m.addSource('points', { type: 'geojson', data });
            m.addLayer({
              id: 'points-layer',
              type: 'circle',
              source: 'points',
              paint: {
                'circle-radius': 6,
                'circle-color': '#3b82f6',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
              },
            });
          }
        });
    }
    // Large dataset: Vector tiles
    else if (pointCount >= 50000) {
      if (!m.getSource('point-tiles')) {
        m.addSource('point-tiles', {
          type: 'vector',
          tiles: [`/api/maps/${mapId}/tile/{z}/{x}/{y}`],
          minzoom: 0,
          maxzoom: 16,
        });
        m.addLayer({
          id: 'tile-points',
          type: 'circle',
          source: 'point-tiles',
          'source-layer': 'points',
          paint: {
            'circle-radius': 4,
            'circle-color': '#3b82f6',
          },
        });
      }
    }
  }, [mapId, pointCount, isLoading]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
