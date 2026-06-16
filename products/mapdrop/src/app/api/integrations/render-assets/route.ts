import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { utility_id, asset_ids, style = 'utility' } = await req.json();

    // Create a new map from the asset GeoJSON
    const map = await prisma.map.create({
      data: {
        name: `Utility Assets — ${utility_id.slice(0, 8)}`,
        userId: 'integration-service',
        status: 'READY',
        isPublic: false,
      },
    });

    // In real implementation, fetch asset geometries from AquaMap and convert to points
    const points = asset_ids.map((id: string, i: number) => ({
      mapId: map.id,
      lat: 40.0 + (Math.random() - 0.5) * 0.1,
      lng: -85.0 + (Math.random() - 0.5) * 0.1,
      name: `Asset ${id.slice(0, 6)}`,
      properties: { assetId: id, style },
    }));

    await prisma.point.createMany({ data: points });

    return NextResponse.json({
      success: true,
      data: {
        mapId: map.id,
        tileUrl: `/api/maps/${map.id}/tile/{z}/{x}/{y}`,
        bounds: { north: 40.05, south: 39.95, east: -84.95, west: -85.05 },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
