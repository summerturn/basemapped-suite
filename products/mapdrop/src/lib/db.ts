import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Environment-aware database URL with sensible pool defaults
// ---------------------------------------------------------------------------
function getDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL is not defined');
  }

  // Only augment if it looks like a standard Postgres URL
  if (!raw.startsWith('postgresql://') && !raw.startsWith('postgres://')) {
    return raw;
  }

  try {
    const url = new URL(raw);

    // Connection pool tuned for Next.js serverless + 150 k row datasets
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '20');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '30');
    }

    return url.toString();
  } catch {
    // If parsing fails (e.g. PgBouncer URI), pass through untouched
    return raw;
  }
}

// ---------------------------------------------------------------------------
// PrismaClient singleton
// ---------------------------------------------------------------------------
const createPrismaClient = () =>
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV === 'development'
        ? (['query', 'info', 'warn', 'error'] as const)
        : (['warn', 'error'] as const),
  });

const prismaBase =
  (globalThis as unknown as { prisma?: PrismaClient }).prisma ??
  createPrismaClient();

// ---------------------------------------------------------------------------
// Extended client with spatial helpers & RLS context setter
// ---------------------------------------------------------------------------
export const prisma = prismaBase.$extends({
  client: {
    /**
     * Set PostgreSQL config variables that RLS policies read.
     * Call this at the start of every request / tRPC context.
     */
    async $setUserContext(
      userId: string | null,
      anonymousToken?: string | null,
      shareToken?: string | null
    ): Promise<void> {
      await prismaBase.$queryRaw`
        SELECT set_config('app.current_user_id', ${userId}, true)
      `;

      if (anonymousToken) {
        await prismaBase.$queryRaw`
          SELECT set_config('app.anonymous_token', ${anonymousToken}, true)
        `;
      }

      if (shareToken) {
        await prismaBase.$queryRaw`
          SELECT set_config('app.share_token', ${shareToken}, true)
        `;
      }
    },

    /**
     * Clear RLS context after a request (optional but hygienic).
     */
    async $clearUserContext(): Promise<void> {
      await prismaBase.$queryRaw`
        SELECT set_config('app.current_user_id', '', true),
               set_config('app.anonymous_token', '', true),
               set_config('app.share_token', '', true)
      `;
    },
  },

  model: {
    // -----------------------------------------------------------------------
    // Point — spatial query helpers
    // -----------------------------------------------------------------------
    point: {
      /**
       * Find points inside a lat/lng bounding box.
       * Uses the GIST index on geom via the && operator.
       */
      async findInBounds(
        mapId: string,
        bounds: {
          north: number;
          south: number;
          east: number;
          west: number;
        }
      ) {
        return prismaBase.$queryRaw`
          SELECT id, lat, lng, properties
          FROM points
          WHERE map_id = ${mapId}::uuid
            AND geom IS NOT NULL
            AND geom && ST_MakeEnvelope(
              ${bounds.west},
              ${bounds.south},
              ${bounds.east},
              ${bounds.north},
              4326
            )
          ORDER BY created_at
        `;
      },

      /**
       * Find points within a radius (metres) of a centre lat/lng.
       * Transforms to EPSG:3857 for metric distance.
       */
      async findNearby(
        mapId: string,
        lat: number,
        lng: number,
        radiusMetres: number,
        limit = 500
      ) {
        return prismaBase.$queryRaw`
          SELECT
            id,
            lat,
            lng,
            properties,
            ST_Distance(
              ST_Transform(geom, 3857),
              ST_Transform(ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), 3857)
            )::int AS distance
          FROM points
          WHERE map_id = ${mapId}::uuid
            AND geom IS NOT NULL
            AND ST_DWithin(
              ST_Transform(geom, 3857),
              ST_Transform(ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), 3857),
              ${radiusMetres}
            )
          ORDER BY distance
          LIMIT ${limit}
        `;
      },

      /**
       * Fast row count for a map — uses the partial index on map_id.
       */
      async countByMap(mapId: string) {
        const result = await prismaBase.$queryRaw<{ count: BigInt }[]>`
          SELECT COUNT(*) AS count FROM points WHERE map_id = ${mapId}::uuid
        `;
        return Number(result[0]?.count ?? 0);
      },
    },

    // -----------------------------------------------------------------------
    // Map — MVT tile helper
    // -----------------------------------------------------------------------
    map: {
      /**
       * Generate a Mapbox Vector Tile for the given map and tile coordinates.
       * Returns a raw Buffer (or null when empty).
       */
      async getTile(
        mapId: string,
        z: number,
        x: number,
        y: number
      ): Promise<Buffer | null> {
        const result = await prismaBase.$queryRaw<{ get_tile: Buffer }[]>`
          SELECT get_tile(${mapId}::uuid, ${z}, ${x}, ${y}) AS get_tile
        `;
        return result[0]?.get_tile ?? null;
      },

      /**
       * Trigger cleanup of expired anonymous maps.
       * Returns number of deleted rows.
       */
      async cleanupExpired(): Promise<number> {
        const result = await prismaBase.$queryRaw<{ deleted: number }[]>`
          SELECT cleanup_expired_maps() AS deleted
        `;
        return Number(result[0]?.deleted ?? 0);
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Preserve the base client across hot reloads in development
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  (globalThis as unknown as { prisma?: PrismaClient }).prisma = prismaBase;
}
