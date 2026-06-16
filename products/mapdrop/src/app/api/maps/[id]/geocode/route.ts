import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const mapId = params.id;

  // Validate map exists and fetch un-geocoded points
  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: {
      points: {
        where: {
          geocodedAt: null,
        },
      },
    },
  });

  if (!map) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  if (map.points.length === 0) {
    return NextResponse.json(
      { error: "No addresses to geocode" },
      { status: 400 }
    );
  }

  // Create GeocodeJob tracking record
  const geocodeJob = await prisma.geocodeJob.create({
    data: {
      mapId,
      status: JobStatus.QUEUED,
      totalRows: map.points.length,
    },
  });

  // TODO: enqueue geocode work via BullMQ once the queue/schema are aligned
  return NextResponse.json({
    jobId: geocodeJob.id,
    status: "queued",
    total: map.points.length,
  });
}
