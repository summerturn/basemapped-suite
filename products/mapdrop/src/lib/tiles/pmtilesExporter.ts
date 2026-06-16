import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { mkdir, rm, stat } from "fs/promises";
import path from "path";
import os from "os";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Storage upload stub — replace with your S3 / R2 SDK
// ---------------------------------------------------------------------------

async function uploadToStorage(
  localPath: string,
  key: string
): Promise<string> {
  // TODO: wire to @aws-sdk/client-s3 or Cloudflare R2 SDK
  // e.g.  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: createReadStream(localPath) }));
  const cdnHost = process.env.CDN_HOST || "https://cdn.mapdrop.io";
  console.log(`[pmtiles] upload ${localPath} → ${key}`);
  return `${cdnHost}/${key}`;
}

// ---------------------------------------------------------------------------
// PMTiles archive builder
// ---------------------------------------------------------------------------

export interface PMTilesExportResult {
  url: string;
  sizeBytes: number;
  pointCount: number;
}

export async function exportToPMTiles(
  mapId: string
): Promise<PMTilesExportResult> {
  const start = performance.now();

  // 1. Verify dataset size + premium eligibility
  const map = await prisma.map.findUnique({
    where: { id: mapId },
    select: { rowCount: true, userId: true, name: true },
  });

  if (!map?.rowCount || map.rowCount < 150_000) {
    throw new Error(
      "PMTiles export is reserved for datasets with 150K+ points."
    );
  }

  // TODO: enforce premium check here if desired
  // const settings = await prisma.userSettings.findUnique({ where: { userId: map.userId! } });
  // if (!settings?.isPremium) throw new Error("Premium required.");

  const tmpDir = path.join(os.tmpdir(), "mapdrop-pmtiles", mapId);
  await mkdir(tmpDir, { recursive: true });

  const ndjsonPath = path.join(tmpDir, "points.ndjson");
  const pmtilesPath = path.join(tmpDir, "output.pmtiles");

  // 2. Stream points to NDJSON in batches
  const writeStream = createWriteStream(ndjsonPath);
  const batchSize = 50_000;
  let offset = 0;
  let total = 0;

  while (true) {
    const batch = await prisma.$queryRaw<
      Array<{
        lng: number;
        lat: number;
        properties: Record<string, unknown> | null;
      }>
    >`
      SELECT lng, lat, properties
      FROM points
      WHERE map_id = ${mapId}::uuid
        AND geom IS NOT NULL
      ORDER BY created_at
      LIMIT ${batchSize} OFFSET ${offset}
    `;

    if (batch.length === 0) break;

    for (const row of batch) {
      const feature = {
        type: "Feature" as const,
        properties: row.properties ?? {},
        geometry: {
          type: "Point" as const,
          coordinates: [row.lng, row.lat],
        },
      };
      writeStream.write(JSON.stringify(feature) + "\n");
    }

    total += batch.length;
    offset += batchSize;

    if (batch.length < batchSize) break;
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.end(() => resolve());
    writeStream.on("error", reject);
  });

  // 3. Run tippecanoe
  await new Promise<void>((resolve, reject) => {
    const args = [
      "-o", pmtilesPath,
      "--drop-densest-as-needed",
      "--maximum-tile-bytes=500000",
      "--base-zoom=0",
      "--minimum-zoom=0",
      "--maximum-zoom=16",
      "--layer=points",
      "--no-feature-limit",
      "--cluster-distance=20",
      ndjsonPath,
    ];

    const proc = spawn("tippecanoe", args, { stdio: "pipe" });
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tippecanoe exited ${code}: ${stderr}`));
    });
  });

  // 4. Upload to object storage
  const key = `archives/${mapId}.pmtiles`;
  const url = await uploadToStorage(pmtilesPath, key);

  const stats = await stat(pmtilesPath);

  // 5. Cleanup
  await rm(tmpDir, { recursive: true, force: true });

  const duration = performance.now() - start;
  console.log(
    `[pmtiles] map ${mapId} exported ${total} points → ${url} ` +
      `(${stats.size} bytes) in ${duration.toFixed(2)}ms`
  );

  return { url, sizeBytes: stats.size, pointCount: total };
}
