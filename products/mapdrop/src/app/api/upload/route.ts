import { NextRequest, NextResponse } from "next/server";
import type { ColumnMapping, GeocodeNeeded, ParsedRow } from "@/types/dataset";

// ------------------------------------------------------------------
// NOTE: Replace these imports with your actual database client.
// Example: import { prisma } from "@/lib/db";
// ------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface UploadBody {
  file: File;
  mapName: string;
  columnMappings: ColumnMapping[];
  geocode: GeocodeNeeded;
}

async function parseFormData(request: NextRequest): Promise<UploadBody> {
  const formData = await request.formData();

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    throw new Error("No file provided.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File exceeds 10MB limit.");
  }

  const mapName = String(formData.get("mapName") ?? "").trim();
  if (!mapName) {
    throw new Error("Map name is required.");
  }

  let columnMappings: ColumnMapping[] = [];
  try {
    const rawMappings = formData.get("columnMappings");
    if (rawMappings) {
      columnMappings = JSON.parse(String(rawMappings));
    }
  } catch {
    throw new Error("Invalid column mappings.");
  }

  let geocode: GeocodeNeeded = { needed: false, reason: "insufficient_data", missingFields: [] };
  try {
    const rawGeocode = formData.get("geocode");
    if (rawGeocode) {
      geocode = JSON.parse(String(rawGeocode));
    }
  } catch {
    throw new Error("Invalid geocode payload.");
  }

  return { file, mapName, columnMappings, geocode };
}

async function parseFileOnServer(file: File): Promise<{ headers: string[]; rows: ParsedRow[]; rowCount: number }> {
  const bytes = await file.arrayBuffer();
  const text = new TextDecoder().decode(bytes);

  // Simple server-side CSV parse for storage (delimiter detection)
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) {
    throw new Error("File is empty.");
  }

  // Detect delimiter from first line
  const delimiters = [",", "\t", ";", "|"];
  let delimiter = ",";
  let maxCols = 0;
  for (const d of delimiters) {
    const cols = lines[0].split(d).length;
    if (cols > maxCols) {
      maxCols = cols;
      delimiter = d;
    }
  }

  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? null;
    });
    rows.push(row);
  }

  return { headers, rows, rowCount: rows.length };
}

async function saveFileToStorage(file: File, mapId: string): Promise<string> {
  // ------------------------------------------------------------------
  // TODO: Replace with your actual file storage logic (S3, Azure Blob, local, etc.)
  // Return a URL or path to the stored file.
  // ------------------------------------------------------------------
  return `/uploads/${mapId}/${file.name}`;
}

async function createMapRecord(params: {
  name: string;
  fileName: string;
  fileUrl: string;
  rowCount: number;
  columnMappings: ColumnMapping[];
  geocode: GeocodeNeeded;
}): Promise<{ id: string }> {
  // ------------------------------------------------------------------
  // TODO: Replace with your actual database insert.
  // Create a Map record and return its ID.
  // ------------------------------------------------------------------
  const mapId = crypto.randomUUID();
  console.log("[createMapRecord] Creating map:", { mapId, ...params });
  return { id: mapId };
}

async function storePoints(params: {
  mapId: string;
  rows: ParsedRow[];
  columnMappings: ColumnMapping[];
  geocode: GeocodeNeeded;
}): Promise<void> {
  // ------------------------------------------------------------------
  // TODO: Replace with your actual PostGIS insert logic.
  // For each row, extract lat/lng if present, or queue for geocoding.
  // Example using raw SQL with ST_GeogFromText or ST_MakePoint.
  // ------------------------------------------------------------------
  const { mapId, rows, columnMappings, geocode } = params;

  const latCol = columnMappings.find(
    (m) => (m.userOverride ?? m.detectedType) === "latitude"
  )?.header;
  const lngCol = columnMappings.find(
    (m) => (m.userOverride ?? m.detectedType) === "longitude"
  )?.header;
  const addressCol = columnMappings.find(
    (m) => (m.userOverride ?? m.detectedType) === "address"
  )?.header;
  const cityCol = columnMappings.find(
    (m) => (m.userOverride ?? m.detectedType) === "city"
  )?.header;
  const stateCol = columnMappings.find(
    (m) => (m.userOverride ?? m.detectedType) === "state"
  )?.header;
  const zipCol = columnMappings.find(
    (m) => (m.userOverride ?? m.detectedType) === "zip"
  )?.header;
  const nameCol = columnMappings.find(
    (m) => (m.userOverride ?? m.detectedType) === "name"
  )?.header;
  const categoryCol = columnMappings.find(
    (m) => (m.userOverride ?? m.detectedType) === "category"
  )?.header;

  const points = rows.map((row, idx) => {
    let lat: number | null = null;
    let lng: number | null = null;

    if (latCol && lngCol) {
      const rawLat = Number(row[latCol]);
      const rawLng = Number(row[lngCol]);
      if (!isNaN(rawLat) && !isNaN(rawLng)) {
        lat = rawLat;
        lng = rawLng;
      }
    }

    return {
      mapId,
      rowIndex: idx,
      name: nameCol ? String(row[nameCol] ?? "") : null,
      category: categoryCol ? String(row[categoryCol] ?? "") : null,
      lat,
      lng,
      address: addressCol ? String(row[addressCol] ?? "") : null,
      city: cityCol ? String(row[cityCol] ?? "") : null,
      state: stateCol ? String(row[stateCol] ?? "") : null,
      zip: zipCol ? String(row[zipCol] ?? "") : null,
      needsGeocode: geocode.needed && (lat == null || lng == null),
      rawRow: row,
    };
  });

  console.log("[storePoints] Prepared points:", points.length);

  // Example PostGIS query pattern (commented out for safety):
  // INSERT INTO points (map_id, name, geom, properties, needs_geocode)
  // VALUES (
  //   mapId,
  //   point.name,
  //   ST_SetSRID(ST_MakePoint(point.lng, point.lat), 4326),
  //   jsonb_build_object('address', point.address, 'city', point.city, ...),
  //   point.needsGeocode
  // )

  // Batch insert would go here using your ORM or raw SQL client.
}

export async function POST(request: NextRequest) {
  try {
    const { file, mapName, columnMappings, geocode } = await parseFormData(request);

    const { rows, rowCount } = await parseFileOnServer(file);

    const mapRecord = await createMapRecord({
      name: mapName,
      fileName: file.name,
      fileUrl: "", // populated after storage
      rowCount,
      columnMappings,
      geocode,
    });

    const fileUrl = await saveFileToStorage(file, mapRecord.id);

    // Optionally update map record with fileUrl here

    await storePoints({
      mapId: mapRecord.id,
      rows,
      columnMappings,
      geocode,
    });

    return NextResponse.json({
      success: true,
      mapId: mapRecord.id,
      rowCount,
      geocodeNeeded: geocode.needed,
    });
  } catch (err) {
    console.error("[POST /api/upload] error:", err);
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
