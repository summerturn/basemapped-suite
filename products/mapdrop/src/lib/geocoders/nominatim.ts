import type { GeocoderClient, GeocodeResult } from "@/types/geocode";
import redis from "@/lib/redis";
import { normalizeAddress } from "./cache";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const RATE_LIMIT_KEY = "geocode:rate:nominatim";
const MIN_INTERVAL_MS = 1000; // 1 req/s

export class NominatimClient implements GeocoderClient {
  name = "nominatim";

  async geocode(address: string): Promise<GeocodeResult | null> {
    await this.enforceRateLimit();

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "MapDrop/1.0 (geocoding@mapdrop.app)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nominatim error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const result = data[0];
    return {
      address,
      normalizedAddress: normalizeAddress(address),
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      source: "nominatim",
      confidence: result.importance ? parseFloat(result.importance) : undefined,
    };
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const lastRequest = await redis.get(RATE_LIMIT_KEY);

    if (lastRequest) {
      const lastTime = parseInt(lastRequest, 10);
      const elapsed = now - lastTime;
      if (elapsed < MIN_INTERVAL_MS) {
        const delay = MIN_INTERVAL_MS - elapsed;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    await redis.set(RATE_LIMIT_KEY, Date.now().toString());
  }
}
