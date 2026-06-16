import { Queue, QueueOptions, Job } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const queueOptions: QueueOptions = {
  connection: {
    url: REDIS_URL,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
};

export const geocodeQueue = new Queue("geocode", queueOptions);

export const deadLetterQueue = new Queue("geocode:dead-letter", queueOptions);

export interface GeocodeJobData {
  mapId: string;
  address: string;
  recordId: string;
  jobId: string; // The GeocodeJob record ID for progress tracking
}

export async function addGeocodeJob(
  data: GeocodeJobData
): Promise<Job<GeocodeJobData>> {
  return geocodeQueue.add(`geocode:${data.mapId}`, data, {
    jobId: `${data.jobId}:${data.recordId}`,
  });
}

export async function addGeocodeJobs(
  jobs: GeocodeJobData[]
): Promise<Job<GeocodeJobData>[]> {
  return geocodeQueue.addBulk(
    jobs.map((data) => ({
      name: `geocode:${data.mapId}`,
      data,
      opts: {
        jobId: `${data.jobId}:${data.recordId}`,
      },
    }))
  );
}
