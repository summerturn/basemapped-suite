import Redis from "ioredis";

// ---------------------------------------------------------------------------
// Redis client singleton
// ---------------------------------------------------------------------------
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const TILE_TTL_SECONDS = 60 * 60; // 1 hour for dynamic tiles
const STATIC_TTL_SECONDS = 60 * 60 * 24; // 24 hours for static archives
const EMPTY_MARKER = Buffer.from("EMPTY");

function tileKey(mapId: string, z: number, x: number, y: number): string {
  return `tile:buffer:${mapId}:${z}:${x}:${y}`;
}

function emptyTileKey(mapId: string, z: number, x: number, y: number): string {
  return `tile:empty:${mapId}:${z}:${x}:${y}`;
}

// ---------------------------------------------------------------------------
// Tile cache helpers
// ---------------------------------------------------------------------------
export const tileCache = {
  /**
   * Retrieve a cached tile buffer. Returns EMPTY_MARKER for known-empty tiles,
   * `null` when nothing is cached.
   */
  async getTileBuffer(
    mapId: string,
    z: number,
    x: number,
    y: number
  ): Promise<Buffer | null | typeof EMPTY_MARKER> {
    const [data, empty] = await Promise.all([
      redis.getBuffer(tileKey(mapId, z, x, y)),
      redis.get(emptyTileKey(mapId, z, x, y)),
    ]);
    if (data) return data;
    if (empty) return EMPTY_MARKER;
    return null;
  },

  /**
   * Store a generated tile buffer and clear any empty-tile marker.
   */
  async setTileBuffer(
    mapId: string,
    z: number,
    x: number,
    y: number,
    buffer: Buffer,
    isStatic = false
  ): Promise<void> {
    const ttl = isStatic ? STATIC_TTL_SECONDS : TILE_TTL_SECONDS;
    const pipeline = redis.pipeline();
    pipeline.setex(tileKey(mapId, z, x, y), ttl, buffer);
    pipeline.del(emptyTileKey(mapId, z, x, y));
    await pipeline.exec();
  },

  /**
   * Mark a tile as empty so we can return 204 instantly.
   */
  async setEmptyTile(
    mapId: string,
    z: number,
    x: number,
    y: number
  ): Promise<void> {
    await redis.setex(emptyTileKey(mapId, z, x, y), TILE_TTL_SECONDS, "1");
  },

  /**
   * Invalidate every cached tile for a given map. Called when the map data
   * is updated or re-geocoded.
   */
  async invalidateMapTiles(mapId: string): Promise<void> {
    const pattern = `tile:*:${mapId}:*`;
    const stream = redis.scanStream({ match: pattern, count: 200 });

    let batch: string[] = [];
    const flush = async () => {
      if (batch.length === 0) return;
      await redis.del(...batch);
      batch = [];
    };

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (keys: string[]) => {
        batch.push(...keys);
        if (batch.length >= 200) {
          flush().catch(reject);
        }
      });
      stream.on("end", () => {
        flush().then(resolve).catch(reject);
      });
      stream.on("error", reject);
    });
  },

  /**
   * Pre-warm tiles for zoom levels 0-6. In production this should be
   * offloaded to a background job (Bull, Inngest, etc.).
   */
  async warmCacheForMap(mapId: string): Promise<void> {
    console.log(`[cache] starting warm for map ${mapId}, zoom 0-6`);
    const { generateTile } = await import("@/lib/tiles/mvtGenerator");

    for (let z = 0; z <= 6; z++) {
      const dim = 1 << z;
      const promises: Promise<void>[] = [];

      for (let x = 0; x < dim; x++) {
        for (let y = 0; y < dim; y++) {
          promises.push(
            generateTile(mapId, z, x, y)
              .then(() => {})
              .catch((err: Error) => {
                // Ignore expected empty tiles; log real errors
                if (!err.message?.includes("empty")) {
                  console.warn(
                    `[cache] warm failed ${z}/${x}/${y}:`,
                    err.message
                  );
                }
              })
          );

          if (promises.length >= 64) {
            await Promise.all(promises);
            promises.length = 0;
          }
        }
      }

      if (promises.length) {
        await Promise.all(promises);
      }
    }

    console.log(`[cache] warm complete for map ${mapId}`);
  },
};

export { EMPTY_MARKER };
