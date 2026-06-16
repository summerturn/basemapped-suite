import { prisma } from "@/lib/db";
import { tileCache, EMPTY_MARKER } from "@/lib/cache/tileCache";

// ---------------------------------------------------------------------------
// Web Mercator tile → WGS-84 bounds
// ---------------------------------------------------------------------------

export interface TileBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

function tileToBounds(z: number, x: number, y: number): TileBounds {
  const n = Math.PI - (2.0 * Math.PI * y) / Math.pow(2, z);
  const north = (180.0 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const s = Math.PI - (2.0 * Math.PI * (y + 1)) / Math.pow(2, z);
  const south = (180.0 / Math.PI) * Math.atan(0.5 * (Math.exp(s) - Math.exp(-s)));
  const west = (x / Math.pow(2, z)) * 360.0 - 180.0;
  const east = ((x + 1) / Math.pow(2, z)) * 360.0 - 180.0;
  return { west, south, east, north };
}

// ---------------------------------------------------------------------------
// MVT tile generator
// ---------------------------------------------------------------------------

export async function generateTile(
  mapId: string,
  z: number,
  x: number,
  y: number
): Promise<Buffer | null> {
  const start = performance.now();

  // 1. Cache lookup
  const cached = await tileCache.getTileBuffer(mapId, z, x, y);
  if (cached === EMPTY_MARKER) {
    return null;
  }
  if (cached !== null) {
    return cached;
  }

  // 2. Fast empty-tile check via GIST index (target < 5 ms)
  const bounds = tileToBounds(z, x, y);
  const existsResult = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS(
      SELECT 1 FROM points
      WHERE map_id = ${mapId}::uuid
        AND geom IS NOT NULL
        AND geom && ST_MakeEnvelope(
          ${bounds.west},
          ${bounds.south},
          ${bounds.east},
          ${bounds.north},
          4326
        )
      LIMIT 1
    ) AS exists
  `;

  if (!existsResult[0]?.exists) {
    await tileCache.setEmptyTile(mapId, z, x, y);
    const duration = performance.now() - start;
    console.log(
      `[mvt] empty tile ${z}/${x}/${y} for map ${mapId} in ${duration.toFixed(2)}ms`
    );
    return null;
  }

  // 3. Build MVT with ST_AsMVT
  //    - Filter in 4326 via GIST, transform to 3857 for MVT geometry
  //    - Only carry necessary properties, pruned by zoom
  const mvtResult = await prisma.$queryRaw<{ mvt: Buffer }[]>`
    WITH mvt_bounds AS (
      SELECT ST_Transform(
        ST_MakeEnvelope(
          ${bounds.west},
          ${bounds.south},
          ${bounds.east},
          ${bounds.north},
          4326
        ),
        3857
      ) AS geom_3857
    ),
    features AS (
      SELECT
        ST_AsMVTGeom(
          ST_Transform(p.geom, 3857),
          b.geom_3857,
          extent => 4096,
          buffer => 256
        ) AS geom,
        p.id::text AS id,
        p.lat,
        p.lng,
        CASE WHEN ${z} >= 8  THEN p.properties->>'category' END AS category,
        CASE WHEN ${z} >= 10 THEN p.properties->>'name'     END AS name,
        CASE WHEN ${z} >= 12 THEN p.properties->>'address'  END AS address,
        CASE WHEN ${z} >= 8  THEN p.properties->>'city'     END AS city,
        CASE WHEN ${z} >= 6  THEN p.properties->>'state'    END AS state
      FROM points p, mvt_bounds b
      WHERE p.map_id = ${mapId}::uuid
        AND p.geom IS NOT NULL
        AND p.geom && ST_MakeEnvelope(
          ${bounds.west},
          ${bounds.south},
          ${bounds.east},
          ${bounds.north},
          4326
        )
    )
    SELECT ST_AsMVT(features.*, 'points') AS mvt
    FROM features
    WHERE features.geom IS NOT NULL
  `;

  const mvt = mvtResult[0]?.mvt ?? null;

  if (!mvt || mvt.length === 0) {
    await tileCache.setEmptyTile(mapId, z, x, y);
    return null;
  }

  // 4. Cache and return
  await tileCache.setTileBuffer(mapId, z, x, y, mvt);

  const duration = performance.now() - start;
  console.log(
    `[mvt] tile ${z}/${x}/${y} for map ${mapId} ` +
      `generated in ${duration.toFixed(2)}ms (${mvt.length} bytes)`
  );

  if (mvt.length > 500_000) {
    console.warn(
      `[mvt] tile ${z}/${x}/${y} exceeds 500KB: ${mvt.length} bytes`
    );
  }

  return mvt;
}
