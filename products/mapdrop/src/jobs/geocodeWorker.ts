import { Worker, Job } from "bullmq";
import {
  GeocodeJobData,
  geocodeQueue,
  deadLetterQueue,
} from "@/lib/geocoders/queue";
import { NominatimClient } from "@/lib/geocoders/nominatim";
import { LocationIQClient } from "@/lib/geocoders/locationiq";
import { MapboxClient } from "@/lib/geocoders/mapbox";
import {
  checkCache,
  setCache,
  normalizeAddress,
} from "@/lib/geocoders/cache";
import type { GeocodeResult } from "@/types/geocode";
import prisma from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const nominatim = new NominatimClient();
const locationiq = new LocationIQClient();
const mapbox = new MapboxClient();

async function updateGeocodeJobCounters(
  geocodeJobId: string,
  incrementProcessed: boolean
) {
  // Use atomic increment to avoid race conditions across workers
  await prisma.geocodeJob.update({
    where: { id: geocodeJobId },
    data: {
      processedRows: incrementProcessed ? { increment: 1 } : undefined,
      failedRows: !incrementProcessed ? { increment: 1 } : undefined,
    },
  });

  // Recalculate percent and status
  const job = await prisma.geocodeJob.findUnique({
    where: { id: geocodeJobId },
  });
  if (!job) return;

  const percentComplete =
    job.totalRows > 0 ? Math.round(((job.processedRows + job.failedRows) / job.totalRows) * 100) : 0;

  const dbStatus: JobStatus =
    job.processedRows + job.failedRows >= job.totalRows
      ? JobStatus.COMPLETED
      : JobStatus.RUNNING;

  await prisma.geocodeJob.update({
    where: { id: geocodeJobId },
    data: {
      status: dbStatus,
      updatedAt: new Date(),
    },
  });
}

async function updatePostGISRecord(
  recordId: string,
  result: GeocodeResult
) {
  await prisma.point.update({
    where: { id: recordId },
    data: {
      lat: result.lat,
      lng: result.lng,
      geocodedAt: new Date(),
    },
  });
}

async function cascadeGeocode(address: string): Promise<GeocodeResult | null> {
  // Tier 0: Cache
  const cached = await checkCache(address);
  if (cached) {
    return {
      address,
      normalizedAddress: normalizeAddress(address),
      lat: cached.lat,
      lng: cached.lng,
      source: "cache",
    };
  }

  // Tier 1: Nominatim
  try {
    const result = await nominatim.geocode(address);
    if (result) {
      await setCache(address, result.lat, result.lng);
      return result;
    }
  } catch (err) {
    console.warn("Nominatim failed:", err);
  }

  // Tier 2: LocationIQ
  try {
    const result = await locationiq.geocode(address);
    if (result) {
      await setCache(address, result.lat, result.lng);
      return result;
    }
  } catch (err) {
    console.warn("LocationIQ failed:", err);
  }

  // Tier 3: Mapbox
  try {
    const result = await mapbox.geocode(address);
    if (result) {
      await setCache(address, result.lat, result.lng);
      return result;
    }
  } catch (err) {
    console.warn("Mapbox failed:", err);
  }

  return null;
}

const worker = new Worker<GeocodeJobData>(
  "geocode",
  async (job: Job<GeocodeJobData>) => {
    const { address, recordId } = job.data;

    await job.updateProgress(0);

    const result = await cascadeGeocode(address);

    if (!result) {
      throw new Error(`Failed to geocode address: ${address}`);
    }

    await updatePostGISRecord(recordId, result);
    await job.updateProgress(100);

    return result;
  },
  {
    connection: {
      url: REDIS_URL,
    },
    limiter: {
      max: 1,
      duration: 1000,
    },
    concurrency: 1,
  }
);

worker.on("completed", async (job: Job<GeocodeJobData>) => {
  console.log(`Geocode job completed: ${job.id}`);
  await updateGeocodeJobCounters(job.data.jobId, true);
});

worker.on("failed", async (job: Job<GeocodeJobData> | undefined, err: Error) => {
  if (!job) return;
  console.error(`Geocode job failed: ${job.id}`, err);

  // Move to dead letter queue if attempts are exhausted
  const maxAttempts = job.opts.attempts ?? 3;
  if (job.attemptsMade >= maxAttempts) {
    await deadLetterQueue.add(job.name, job.data, {
      jobId: `dlq:${job.id}`,
    });
  }

  await updateGeocodeJobCounters(job.data.jobId, false);
});

export default worker;
