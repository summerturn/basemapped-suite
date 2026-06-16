import type { GeocoderClient, GeocodeResult } from "@/types/geocode";
import redis from "@/lib/redis";
import { normalizeAddress } from "./cache";

const MAPBOX_BATCH_URL = "https://api.mapbox.com/search/geocode/v6/batch";
const MAPBOX_SINGLE_URL = "https://api.mapbox.com/search/geocode/v6/forward";
const RATE_LIMIT_KEY = "geocode:rate:mapbox";
const MIN_INTERVAL_MS = 100; // 600 req/min = 10 req/s

export class MapboxClient implements GeocoderClient {
  name = "mapbox";
  private accessToken: string;

  constructor() {
    this.accessToken = process.env.MAPBOX_ACCESS_TOKEN || "";
    if (!this.accessToken) {
      console.warn("MAPBOX_ACCESS_TOKEN not set");
    }
  }

  async geocode(address: string): Promise<GeocodeResult | null> {
    await this.enforceRateLimit();

    const url = new URL(MAPBOX_SINGLE_URL);
    url.searchParams.set("q", address);
    url.searchParams.set("access_token", this.accessToken);
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Mapbox rate limited");
      }
      throw new Error(
        `Mapbox error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const features = data.features;
    if (!features || features.length === 0) return null;

    const feature = features[0];
    const [lng, lat] = feature.geometry.coordinates;

    return {
      address,
      normalizedAddress: normalizeAddress(address),
      lat,
      lng,
      source: "mapbox",
      confidence: feature.properties?.relevance,
    };
  }

  async geocodeBatch(addresses: string[]): Promise<(GeocodeResult | null)[]> {
    if (addresses.length === 0) return [];
    if (addresses.length > 1000) {
      throw new Error("Mapbox batch limit is 1,000 addresses");
    }

    await this.enforceRateLimit();

    const permanentParams = new URLSearchParams();
    permanentParams.set("access_token", this.accessToken);

    const batchBody = addresses.map((addr) => ({
      types: ["address", "place", "locality"],
      q: addr,
      limit: 1,
    }));

    const url = `${MAPBOX_BATCH_URL}?${permanentParams.toString()}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(batchBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Mapbox rate limited");
      }
      throw new Error(
        `Mapbox batch error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const results: (GeocodeResult | null)[] = data.batchItems.map(
      (item: any, index: number) => {
        const features = item.features;
        if (!features || features.length === 0) return null;
        const feature = features[0];
        const [lng, lat] = feature.geometry.coordinates;
        return {
          address: addresses[index],
          normalizedAddress: normalizeAddress(addresses[index]),
          lat,
          lng,
          source: "mapbox" as const,
          confidence: feature.properties?.relevance,
        };
      }
    );

    return results;
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
