import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { error: "Missing jobId parameter" },
      { status: 400 }
    );
  }

  const job = await prisma.geocodeJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const elapsedMs = Date.now() - job.createdAt.getTime();
  const estimatedSecondsRemaining =
    job.status === JobStatus.RUNNING && job.processedRows > 0
      ? Math.ceil(
          ((job.totalRows - job.processedRows - job.failedRows) / (job.processedRows + job.failedRows)) *
            (elapsedMs / 1000)
        )
      : 0;

  return NextResponse.json({
    id: job.id,
    mapId: job.mapId,
    status: job.status,
    total: job.totalRows,
    processed: job.processedRows,
    failed: job.failedRows,
    percentComplete:
      job.totalRows > 0
        ? Math.round(((job.processedRows + job.failedRows) / job.totalRows) * 100)
        : 0,
    estimatedSecondsRemaining: Math.max(0, estimatedSecondsRemaining),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
