import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateTile } from "@/lib/tiles/mvtGenerator";

// ---------------------------------------------------------------------------
// Access validation
// ---------------------------------------------------------------------------

async function validateAccess(
  mapId: string,
  request: NextRequest
): Promise<boolean> {
  const map = await prisma.map.findUnique({
    where: { id: mapId },
    select: { isPublic: true, userId: true, anonymousToken: true },
  });

  if (!map) return false;
  if (map.isPublic) return true;

  // Authenticated user ownership
  const userId = request.headers.get("x-user-id");
  if (userId && map.userId === userId) return true;

  // Anonymous token ownership
  const anonToken = request.headers.get("x-anonymous-token");
  if (anonToken && map.anonymousToken === anonToken) return true;

  // Share token
  const shareToken = request.headers.get("x-share-token");
  if (shareToken) {
    const link = await prisma.shareLink.findFirst({
      where: { mapId, token: shareToken },
      select: { id: true },
    });
    if (link) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// GET /api/maps/[id]/tile/[z]/[x]/[y]
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; z: string; x: string; y: string }> | { id: string; z: string; x: string; y: string } }
) {
  const start = performance.now();

  // Next.js 14/15 compatibility: params may be a Promise
  const params = await Promise.resolve(context.params);
  const { id: mapId, z: zs, x: xs, y: ys } = params;

  const z = parseInt(zs, 10);
  const x = parseInt(xs, 10);
  const y = parseInt(ys, 10);

  if ([z, x, y].some((n) => Number.isNaN(n) || n < 0)) {
    return new NextResponse("Invalid tile coordinates", { status: 400 });
  }

  const dim = 1 << z;
  if (z > 22 || x >= dim || y >= dim) {
    return new NextResponse("Tile out of bounds", { status: 404 });
  }

  try {
    const hasAccess = await validateAccess(mapId, request);
    if (!hasAccess) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const mvt = await generateTile(mapId, z, x, y);
    const duration = performance.now() - start;

    // Empty tile — 204 No Content (fast path < 10 ms via cached empties)
    if (!mvt) {
      const res = new NextResponse(null, { status: 204 });
      res.headers.set("Cache-Control", "public, max-age=3600");
      res.headers.set("X-Tile-Gen-Time", `${duration.toFixed(2)}ms`);
      res.headers.set("X-Tile-Empty", "1");
      return res;
    }

    // Valid MVT payload
    const res = new NextResponse(new Uint8Array(mvt));
    res.headers.set("Content-Type", "application/x-protobuf");
    res.headers.set("Content-Length", String(mvt.length));
    res.headers.set("Cache-Control", "public, max-age=3600");
    res.headers.set("X-Tile-Gen-Time", `${duration.toFixed(2)}ms`);

    if (duration > 1000) {
      console.warn(
        `[tile] slow tile ${z}/${x}/${y} map ${mapId}: ${duration.toFixed(2)}ms`
      );
    }

    return res;
  } catch (err) {
    console.error(`[tile] error ${z}/${x}/${y} map ${mapId}:`, err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
