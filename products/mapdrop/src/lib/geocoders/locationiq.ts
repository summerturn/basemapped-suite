import type { GeocoderClient, GeocodeResult } from "@/types/geocode";
import redis from "@/lib/redis";
import { normalizeAddress } from "./cache";

const LOCATIONIQ_URL = "https://us1.locationiq.com/v1/search.php";
const RATE_LIMIT_KEY = "geocode:rate:locationiq";
const DAILY_COUNT_KEY = "geocode:budget:locationiq:daily";
const MIN_INTERVAL_MS = 500; // 2 req/s
const DAILY_LIMIT = 5000;

export class LocationIQClient implements GeocoderClient {
  name = "locationiq";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.LOCATIONIQ_API_KEY || "";
    if (!this.apiKey) {
      console.warn("LOCATIONIQ_API_KEY not set");
    }
  }

  async geocode(address: string): Promise<GeocodeResult | null> {
    await this.enforceRateLimit();

    if (!(await this.checkBudget())) {
      throw new Error("LocationIQ daily budget exceeded");
    }

    const url = new URL(LOCATIONIQ_URL);
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("key", this.apiKey);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("LocationIQ rate limited");
      }
      throw new Error(
        `LocationIQ error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    await this.incrementBudget();

    const result = data[0];
    return {
      address,
      normalizedAddress: normalizeAddress(address),
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      source: "locationiq",
      confidence: result.importance
        ? parseFloat(result.importance)
        : undefined,
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

  private async checkBudget(): Promise<boolean> {
    const count = await redis.get(DAILY_COUNT_KEY);
    if (!count) return true;
    return parseInt(count, 10) < DAILY_LIMIT;
  }

  private async incrementBudget(): Promise<void> {
    const pipeline = redis.pipeline();
    pipeline.incr(DAILY_COUNT_KEY);
    pipeline.expire(DAILY_COUNT_KEY, 24 * 60 * 60); // 24 hours
    await pipeline.exec();
  }
}
