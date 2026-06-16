import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mapId = params.id;
    const points = await prisma.point.findMany({
      where: { mapId },
      take: 5000,
    });

    const geojson = {
      type: 'FeatureCollection',
      features: points.map((p: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat],
        },
        properties: p.properties || {},
      })),
    };

    return NextResponse.json(geojson);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch points' }, { status: 500 });
  }
}
