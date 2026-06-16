import redis from "@/lib/redis";

const CACHE_HASH_KEY = "geocode:cache";
const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

export function normalizeAddress(address: string): string {
  return address.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function checkCache(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const normalized = normalizeAddress(address);
  const cached = await redis.hget(CACHE_HASH_KEY, normalized);
  if (!cached) return null;

  const [lat, lng] = cached.split(",").map(Number);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
}

export async function setCache(
  address: string,
  lat: number,
  lng: number
): Promise<void> {
  const normalized = normalizeAddress(address);
  await redis.hset(CACHE_HASH_KEY, normalized, `${lat},${lng}`);
  await redis.expire(CACHE_HASH_KEY, TTL_SECONDS);
}
