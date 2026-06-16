'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  ScaleControl,
} from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Map as MapIcon,
  Layers,
  Pencil,
  Trash2,
  Circle,
  Minus,
  Square,
} from 'lucide-react';

interface Asset {
  id: string;
  external_id?: string;
  status: string;
  material?: string;
  asset_type_id?: string;
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: any;
  };
}

interface AssetMapProps {
  assets: Asset[];
  onAssetClick?: (asset: Asset) => void;
  onDrawComplete?: (geometry: any) => void;
  height?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  under_repair: '#F59E0B',
  inactive: '#EF4444',
  retired: '#6B7280',
  planned: '#3B82F6',
};

export default function AssetMap({
  assets,
  onAssetClick,
  onDrawComplete,
  height = '600px',
}: AssetMapProps) {
  const mapRef = useRef<any>(null);
  const [popupInfo, setPopupInfo] = useState<Asset | null>(null);
  const [activeLayers, setActiveLayers] = useState({
    points: true,
    lines: true,
    polygons: true,
  });
  const [drawMode, setDrawMode] = useState<'off' | 'point' | 'line' | 'polygon'>('off');
  const [drawCoords, setDrawCoords] = useState<number[][]>([]);

  const points = assets.filter((a) => a.geometry?.type === 'Point');
  const lines = assets.filter((a) => a.geometry?.type === 'LineString');
  const polygons = assets.filter((a) => a.geometry?.type === 'Polygon');

  const pointGeoJSON = {
    type: 'FeatureCollection' as const,
    features: points.map((a) => ({
      type: 'Feature' as const,
      geometry: a.geometry,
      properties: { ...a },
    })),
  };

  const lineGeoJSON = {
    type: 'FeatureCollection' as const,
    features: lines.map((a) => ({
      type: 'Feature' as const,
      geometry: a.geometry,
      properties: { ...a },
    })),
  };

  const polyGeoJSON = {
    type: 'FeatureCollection' as const,
    features: polygons.map((a) => ({
      type: 'Feature' as const,
      geometry: a.geometry,
      properties: { ...a },
    })),
  };

  const handleMapClick = useCallback(
    (event: any) => {
      if (drawMode === 'off') {
        const features = event.features;
        if (features && features.length > 0) {
          const props = features[0].properties;
          const asset = assets.find((a) => a.id === props.id);
          if (asset) {
            setPopupInfo(asset);
            onAssetClick?.(asset);
          }
        } else {
          setPopupInfo(null);
        }
        return;
      }

      const coord: number[] = [event.lngLat.lng, event.lngLat.lat];

      if (drawMode === 'point') {
        onDrawComplete?.({ type: 'Point', coordinates: coord });
        setDrawMode('off');
        return;
      }

      const nextCoords = [...drawCoords, coord];
      setDrawCoords(nextCoords);

      if (drawMode === 'line' && nextCoords.length >= 2) {
        onDrawComplete?.({ type: 'LineString', coordinates: nextCoords });
        setDrawCoords([]);
        setDrawMode('off');
      } else if (drawMode === 'polygon' && nextCoords.length >= 3) {
        const closed = [...nextCoords, nextCoords[0]];
        onDrawComplete?.({ type: 'Polygon', coordinates: [closed] });
        setDrawCoords([]);
        setDrawMode('off');
      }
    },
    [drawMode, drawCoords, assets, onAssetClick, onDrawComplete]
  );

  useEffect(() => {
    if (drawMode !== 'off') setPopupInfo(null);
  }, [drawMode]);

  const layerStylePoints: maplibregl.CircleLayerSpecification = {
    id: 'asset-points',
    type: 'circle',
    source: 'points',
    paint: {
      'circle-radius': 8,
      'circle-color': ['get', ['to-string', ['get', 'status']], ['literal', STATUS_COLORS]],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  };

  const layerStyleLines: maplibregl.LineLayerSpecification = {
    id: 'asset-lines',
    type: 'line',
    source: 'lines',
    paint: {
      'line-width': 3,
      'line-color': ['get', ['to-string', ['get', 'status']], ['literal', STATUS_COLORS]],
    },
  };

  const layerStylePolys: maplibregl.FillLayerSpecification = {
    id: 'asset-polygons',
    type: 'fill',
    source: 'polygons',
    paint: {
      'fill-color': ['get', ['to-string', ['get', 'status']], ['literal', STATUS_COLORS]],
      'fill-opacity': 0.4,
      'fill-outline-color': '#1F2937',
    },
  };

  const drawLayer: maplibregl.CircleLayerSpecification = {
    id: 'draw-points',
    type: 'circle',
    source: 'draw',
    paint: {
      'circle-radius': 6,
      'circle-color': '#EF4444',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  };

  return (
    <div className="relative rounded-xl border border-gray-200 overflow-hidden" style={{ height }}>
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <div className="bg-white/90 backdrop-blur rounded-lg shadow p-1 flex gap-1">
          <button
            onClick={() => setActiveLayers((p) => ({ ...p, points: !p.points }))}
            className={`p-2 rounded-md text-xs font-medium flex items-center gap-1 ${
              activeLayers.points ? 'bg-primary-50 text-primary-700' : 'text-gray-500'
            }`}
            title="Toggle Points"
          >
            <Circle size={14} /> Points
          </button>
          <button
            onClick={() => setActiveLayers((p) => ({ ...p, lines: !p.lines }))}
            className={`p-2 rounded-md text-xs font-medium flex items-center gap-1 ${
              activeLayers.lines ? 'bg-primary-50 text-primary-700' : 'text-gray-500'
            }`}
            title="Toggle Lines"
          >
            <Minus size={14} /> Lines
          </button>
          <button
            onClick={() => setActiveLayers((p) => ({ ...p, polygons: !p.polygons }))}
            className={`p-2 rounded-md text-xs font-medium flex items-center gap-1 ${
              activeLayers.polygons ? 'bg-primary-50 text-primary-700' : 'text-gray-500'
            }`}
            title="Toggle Polygons"
          >
            <Square size={14} /> Polygons
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur rounded-lg shadow p-1 flex gap-1">
          <button
            onClick={() => setDrawMode((m) => (m === 'point' ? 'off' : 'point'))}
            className={`p-2 rounded-md text-xs font-medium flex items-center gap-1 ${
              drawMode === 'point' ? 'bg-primary-50 text-primary-700' : 'text-gray-500'
            }`}
            title="Draw Point"
          >
            <Pencil size={14} /> Point
          </button>
          <button
            onClick={() => setDrawMode((m) => (m === 'line' ? 'off' : 'line'))}
            className={`p-2 rounded-md text-xs font-medium flex items-center gap-1 ${
              drawMode === 'line' ? 'bg-primary-50 text-primary-700' : 'text-gray-500'
            }`}
            title="Draw Line"
          >
            <Minus size={14} /> Line
          </button>
          <button
            onClick={() => setDrawMode((m) => (m === 'polygon' ? 'off' : 'polygon'))}
            className={`p-2 rounded-md text-xs font-medium flex items-center gap-1 ${
              drawMode === 'polygon' ? 'bg-primary-50 text-primary-700' : 'text-gray-500'
            }`}
            title="Draw Polygon"
          >
            <Square size={14} /> Polygon
          </button>
          {drawMode !== 'off' && (
            <button
              onClick={() => {
                setDrawMode('off');
                setDrawCoords([]);
              }}
              className="p-2 rounded-md text-xs font-medium text-red-600"
              title="Cancel Draw"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {drawMode !== 'off' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-primary-700 text-white text-xs px-3 py-1 rounded-full shadow">
          Click on the map to draw {drawMode} ({drawMode === 'polygon' ? 'min 3 points' : 'min 2 points'})
        </div>
      )}

      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -85,
          latitude: 40,
          zoom: 13,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        interactiveLayerIds={['asset-points', 'asset-lines', 'asset-polygons']}
        onClick={handleMapClick}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {activeLayers.points && (
          <Source id="points" type="geojson" data={pointGeoJSON}>
            <Layer {...layerStylePoints} />
          </Source>
        )}

        {activeLayers.lines && (
          <Source id="lines" type="geojson" data={lineGeoJSON}>
            <Layer {...layerStyleLines} />
          </Source>
        )}

        {activeLayers.polygons && (
          <Source id="polygons" type="geojson" data={polyGeoJSON}>
            <Layer {...layerStylePolys} />
          </Source>
        )}

        {drawCoords.length > 0 && (
          <Source
            id="draw"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: drawCoords.map((c) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: c },
                properties: {},
              })),
            }}
          >
            <Layer {...drawLayer} />
          </Source>
        )}

        {popupInfo && (
          <Popup
            longitude={popupInfo.geometry.coordinates[0]}
            latitude={popupInfo.geometry.coordinates[1]}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
          >
            <div className="p-2 min-w-[180px]">
              <h3 className="font-semibold text-sm text-gray-900">
                {popupInfo.external_id || popupInfo.id.slice(0, 8)}
              </h3>
              <div className="mt-1 space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[popupInfo.status] || '#6B7280' }}
                  />
                  Status: <span className="font-medium capitalize">{popupInfo.status}</span>
                </div>
                <div>Material: {popupInfo.material || 'N/A'}</div>
                <div>Type: {popupInfo.asset_type_id || 'N/A'}</div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
