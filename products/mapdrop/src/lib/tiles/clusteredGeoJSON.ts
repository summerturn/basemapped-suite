import Supercluster from "supercluster";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface ClusterOptions {
  /** Max features to return per request (hard cap). */
  featureLimit?: number;
  /** Supercluster radius in pixels. */
  radius?: number;
  /** Supercluster extent (tile size in pixels). */
  extent?: number;
}

// ---------------------------------------------------------------------------
// Server-side clustered GeoJSON
// ---------------------------------------------------------------------------

export async function generateClusteredGeoJSON(
  mapId: string,
  zoom: number,
  bbox: BBox,
  options: ClusterOptions = {}
): Promise<GeoJSON.FeatureCollection> {
  const start = performance.now();
  const { featureLimit = 10_000, radius = 40, extent = 512 } = options;

  // 1. Fetch points inside viewport (GIST index on geom)
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      lat: number;
      lng: number;
      properties: Record<string, unknown> | null;
    }>
  >`
    SELECT id, lat, lng, properties
    FROM points
    WHERE map_id = ${mapId}::uuid
      AND geom IS NOT NULL
      AND geom && ST_MakeEnvelope(
        ${bbox.west},
        ${bbox.south},
        ${bbox.east},
        ${bbox.north},
        4326
      )
    ORDER BY created_at
    LIMIT ${featureLimit}
  `;

  if (rows.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  // 2. Build GeoJSON features
  const features: GeoJSON.Feature<GeoJSON.Point>[] = rows.map((row) => ({
    type: "Feature",
    properties: { ...(row.properties ?? {}), _id: row.id },
    geometry: {
      type: "Point",
      coordinates: [row.lng, row.lat],
    },
  }));

  // 3. Run Supercluster server-side
  const cluster = new Supercluster({
    radius,
    extent,
    maxZoom: 16,
    minPoints: 2,
    nodeSize: 64,
    map: (props) => props,
    reduce: (accumulated, props) => {
      // lightweight reduce: keep count of aggregated features
      accumulated.point_count = (accumulated.point_count || 0) + 1;
      return accumulated;
    },
  });

  cluster.load(features as Parameters<typeof cluster.load>[0]);

  const clusters = cluster.getClusters(
    [bbox.west, bbox.south, bbox.east, bbox.north],
    Math.round(zoom)
  );

  const duration = performance.now() - start;
  console.log(
    `[cluster] map ${mapId} | ${rows.length} pts → ${clusters.length} clusters ` +
      `in ${duration.toFixed(2)}ms (zoom ${zoom})`
  );

  return { type: "FeatureCollection", features: clusters };
}
