'use client';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/app/lib/api';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function AssetMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.get('/api/v1/assets').then((r) => r.data.data),
  });

  useEffect(() => {
    if (!mapRef.current || !assets) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [-85, 40],
      zoom: 13,
    });

    map.on('load', () => {
      const features = assets
        .filter((a: any) => a.geometry && a.geometry.coordinates)
        .map((a: any) => ({
          type: 'Feature',
          geometry: a.geometry,
          properties: { id: a.id, externalId: a.external_id, status: a.status, material: a.material },
        }));

      map.addSource('assets', { type: 'geojson', data: { type: 'FeatureCollection', features } });
      map.addLayer({
        id: 'asset-points',
        type: 'circle',
        source: 'assets',
        paint: {
          'circle-radius': 8,
          'circle-color': ['match', ['get', 'status'], 'active', '#10B981', 'under_repair', '#F59E0B', 'inactive', '#EF4444', '#6B7280'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      map.on('click', 'asset-points', (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${feat.properties.externalId || feat.properties.id.slice(0, 8)}</strong><br/>Status: ${feat.properties.status}<br/>Material: ${feat.properties.material || 'N/A'}`)
          .addTo(map);
      });
    });

    return () => map.remove();
  }, [assets]);

  return (
    <div className="h-[calc(100vh-3rem)]">
      <h1 className="text-xl font-bold mb-3">Asset Map</h1>
      <div ref={mapRef} className="w-full h-full rounded-xl border border-gray-200" />
    </div>
  );
}
