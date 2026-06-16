"use client";

import React, { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";

// ---------------------------------------------------------------------------
// Data-source mode routing
// ---------------------------------------------------------------------------

type DataSourceMode = "geojson" | "clustered" | "mvt" | "pmtiles";

function resolveMode(pointCount: number, isPremium: boolean): DataSourceMode {
  if (pointCount >= 150_000 && isPremium) return "pmtiles";
  if (pointCount >= 50_000) return "mvt";
  if (pointCount >= 5_000) return "clustered";
  return "geojson";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataSourceManagerProps {
  /** MapLibre (or Mapbox) map instance. */
  map: maplibregl.Map;
  mapId: string;
  pointCount: number;
  isPremium: boolean;
  /** Required when mode resolves to "pmtiles". */
  pmtilesUrl?: string;
  /** Called when the source has finished initial load. */
  onLoad?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DataSourceManager: React.FC<DataSourceManagerProps> = ({
  map,
  mapId,
  pointCount,
  isPremium,
  pmtilesUrl,
  onLoad,
}) => {
  const mode = resolveMode(pointCount, isPremium);
  const loadedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // -----------------------------------------------------------------------
  // Cleanup helper
  // -----------------------------------------------------------------------
  const removeAllSources = useCallback(() => {
    const layers = [
      "points-layer",
      "cluster-layer",
      "cluster-count",
      "unclustered-point",
      "mvt-layer",
      "pmtiles-layer",
    ];
    const sources = ["points", "clusters", "mvt-tiles", "pmtiles-source"];

    for (const layerId of layers) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    }
    for (const sourceId of sources) {
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    }
  }, [map]);

  // -----------------------------------------------------------------------
  // Mode: direct GeoJSON (< 5K) with client-side clustering
  // -----------------------------------------------------------------------
  const setupGeoJSON = useCallback(async () => {
    abortRef.current = new AbortController();
    const res = await fetch(`/api/maps/${mapId}/geojson`, {
      signal: abortRef.current.signal,
    });
    if (!res.ok) throw new Error("Failed to load GeoJSON");
    const geojson: GeoJSON.FeatureCollection = await res.json();

    map.addSource("points", {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    map.addLayer({
      id: "cluster-layer",
      type: "circle",
      source: "points",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#51bbd6",
        "circle-radius": [
          "step",
          ["get", "point_count"],
          20,
          100,
          30,
          750,
          40,
        ],
      },
    });

    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "points",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12,
      },
    });

    map.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: "points",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": "#11b4da",
        "circle-radius": 4,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff",
      },
    });

    onLoad?.();
  }, [map, mapId, onLoad]);

  // -----------------------------------------------------------------------
  // Mode: server-side clustered GeoJSON (5K – 50K)
  // -----------------------------------------------------------------------
  const setupClustered = useCallback(() => {
    map.addSource("clusters", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: false,
    });

    map.addLayer({
      id: "points-layer",
      type: "circle",
      source: "clusters",
      paint: {
        "circle-radius": [
          "case",
          ["has", "point_count"],
          ["step", ["get", "point_count"], 15, 10, 20, 100, 25],
          5,
        ],
        "circle-color": [
          "case",
          ["has", "point_count"],
          "#e74c3c",
          "#3498db",
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff",
      },
    });

    const fetchClusters = async () => {
      const zoom = Math.round(map.getZoom());
      const b = map.getBounds();
      const params = new URLSearchParams({
        zoom: String(zoom),
        west: String(b.getWest()),
        south: String(b.getSouth()),
        east: String(b.getEast()),
        north: String(b.getNorth()),
      });
      const res = await fetch(`/api/maps/${mapId}/clusters?${params.toString()}`);
      if (!res.ok) return;
      const fc: GeoJSON.FeatureCollection = await res.json();
      const src = map.getSource("clusters") as maplibregl.GeoJSONSource | undefined;
      src?.setData(fc);
    };

    map.once("idle", () => {
      fetchClusters().then(() => onLoad?.());
    });
    map.on("moveend", fetchClusters);

    // Return teardown fn
    return () => {
      map.off("moveend", fetchClusters);
    };
  }, [map, mapId, onLoad]);

  // -----------------------------------------------------------------------
  // Mode: MVT vector tiles (50K – 150K)
  // -----------------------------------------------------------------------
  const setupMVT = useCallback(() => {
    const tileUrl = `${window.location.origin}/api/maps/${mapId}/tile/{z}/{x}/{y}`;

    map.addSource("mvt-tiles", {
      type: "vector",
      tiles: [tileUrl],
      minzoom: 0,
      maxzoom: 16,
    });

    map.addLayer({
      id: "mvt-layer",
      type: "circle",
      source: "mvt-tiles",
      "source-layer": "points",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          2,
          10,
          4,
          16,
          6,
        ],
        "circle-color": "#2ecc71",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#1e8449",
      },
    });

    map.once("idle", () => onLoad?.());
  }, [map, mapId, onLoad]);

  // -----------------------------------------------------------------------
  // Mode: PMTiles archive (150K+ premium)
  // -----------------------------------------------------------------------
  const setupPMTiles = useCallback(() => {
    if (!pmtilesUrl) {
      console.error("[DataSourceManager] pmtilesUrl is required for PMTiles mode");
      return;
    }

    // Dynamic import keeps the heavy PMTiles client out of the main bundle
    // until it is actually needed.
    import("pmtiles").then(({ Protocol }) => {
      const protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);

      map.addSource("pmtiles-source", {
        type: "vector",
        url: `pmtiles://${pmtilesUrl}`,
        minzoom: 0,
        maxzoom: 16,
      });

      map.addLayer({
        id: "pmtiles-layer",
        type: "circle",
        source: "pmtiles-source",
        "source-layer": "points",
        paint: {
          "circle-radius": 3,
          "circle-color": "#9b59b6",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fff",
        },
      });

      map.once("idle", () => onLoad?.());
    });
  }, [map, pmtilesUrl, onLoad]);

  // -----------------------------------------------------------------------
  // Orchestrate mode switches
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!map || loadedRef.current) return;
    loadedRef.current = true;

    removeAllSources();

    let cleanup: (() => void) | undefined;

    switch (mode) {
      case "geojson":
        setupGeoJSON().catch(console.error);
        break;
      case "clustered":
        cleanup = setupClustered();
        break;
      case "mvt":
        setupMVT();
        break;
      case "pmtiles":
        setupPMTiles();
        break;
    }

    return () => {
      abortRef.current?.abort();
      cleanup?.();
      removeAllSources();
      loadedRef.current = false;
    };
  }, [map, mode, setupGeoJSON, setupClustered, setupMVT, setupPMTiles, removeAllSources]);

  // This component is headless — it manages sources, not UI.
  return null;
};

// ---------------------------------------------------------------------------
// Lazy re-export for code-splitting
// ---------------------------------------------------------------------------

export default DataSourceManager;
