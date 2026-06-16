import { Pool, PoolConfig, QueryResult } from "pg";
import { env } from "./env";

const poolConfig: PoolConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error", err);
});

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  fn: (client: Pool) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client as any);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function toGeoJSON(geometryWKB: string | Buffer): Record<string, any> | null {
  if (!geometryWKB) return null;
  // PostGIS ST_AsGeoJSON returns a GeoJSON Feature or Geometry string
  // If already a JSON string from ST_AsGeoJSON, parse it
  if (typeof geometryWKB === "string" && geometryWKB.trim().startsWith("{")) {
    return JSON.parse(geometryWKB);
  }
  // If raw WKB, you'd need a parser like wellknown or @terraformer/wkt
  // For now assume callers use ST_AsGeoJSON() in SQL
  return null;
}
