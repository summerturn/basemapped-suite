import { parse } from 'csv-parse/sync';
import { Queue } from 'bullmq';
import { knex } from '../../config/database.js';
import { env } from '../../config/env.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface ParsedAssetRow {
  assetTypeId?: string;
  externalId?: string;
  geometry?: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: any;
  };
  attributes?: Record<string, any>;
  status?: string;
  conditionRating?: number;
  installDate?: string;
  material?: string;
  diameterMm?: number;
  lengthM?: number;
  depthM?: number;
  address?: string;
}

export function parseCSV(buffer: Buffer): ParsedAssetRow[] {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((row: Record<string, string>) => ({
    externalId: row.external_id || row.externalId || row.id || row.ID || undefined,
    assetTypeId: row.asset_type_id || row.assetTypeId || row.type_id || undefined,
    status: row.status || 'active',
    conditionRating: row.condition_rating ? Number(row.condition_rating) : undefined,
    installDate: row.install_date || row.installDate || undefined,
    material: row.material || undefined,
    diameterMm: row.diameter_mm ? Number(row.diameter_mm) : undefined,
    lengthM: row.length_m ? Number(row.length_m) : undefined,
    depthM: row.depth_m ? Number(row.depth_m) : undefined,
    address: row.address || undefined,
    attributes: row,
    geometry:
      row.lat && row.lon
        ? {
            type: 'Point',
            coordinates: [Number(row.lon), Number(row.lat)],
          }
        : undefined,
  }));
}

export async function parseShapefile(zipPath: string): Promise<ParsedAssetRow[]> {
  const extractDir = path.join('/tmp', `shapefile-${Date.now()}`);
  fs.mkdirSync(extractDir, { recursive: true });

  try {
    execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, { stdio: 'ignore' });
  } catch {
    throw new Error('Unable to extract shapefile zip. Ensure unzip is available.');
  }

  const files = fs.readdirSync(extractDir);
  const shpFile = files.find((f) => f.endsWith('.shp'));
  const dbfFile = files.find((f) => f.endsWith('.dbf'));

  if (!shpFile) {
    fs.rmSync(extractDir, { recursive: true, force: true });
    throw new Error('No .shp file found in archive');
  }

  try {
    const shapefile = await import('shapefile');
    const source = await shapefile.open(
      path.join(extractDir, shpFile),
      dbfFile ? path.join(extractDir, dbfFile) : undefined
    );
    const features: any[] = [];
    let result = await source.read();
    while (!result.done) {
      features.push(result.value);
      result = await source.read();
    }

    return features.map((f) => ({
      externalId: f.properties?.id || f.properties?.external_id || f.properties?.OBJECTID,
      assetTypeId: f.properties?.asset_type_id || f.properties?.type_id,
      status: f.properties?.status || 'active',
      conditionRating: f.properties?.condition_rating ? Number(f.properties.condition_rating) : undefined,
      material: f.properties?.material,
      diameterMm: f.properties?.diameter_mm ? Number(f.properties.diameter_mm) : undefined,
      lengthM: f.properties?.length_m ? Number(f.properties.length_m) : undefined,
      depthM: f.properties?.depth_m ? Number(f.properties.depth_m) : undefined,
      address: f.properties?.address,
      attributes: f.properties || {},
      geometry: f.geometry,
    }));
  } catch (err) {
    throw new Error(`Shapefile parsing failed: ${(err as Error).message}`);
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

export function validateRows(rows: ParsedAssetRow[]): {
  valid: ParsedAssetRow[];
  errors: Array<{ row: number; message: string }>;
} {
  const valid: ParsedAssetRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  rows.forEach((row, idx) => {
    if (!row.geometry && !row.externalId) {
      errors.push({ row: idx + 1, message: 'Row must have geometry or externalId' });
      return;
    }
    if (row.geometry) {
      const g = row.geometry;
      if (!g.type || !Array.isArray(g.coordinates)) {
        errors.push({ row: idx + 1, message: 'Invalid geometry format' });
        return;
      }
      if (g.type === 'Point' && g.coordinates.length !== 2) {
        errors.push({ row: idx + 1, message: 'Point geometry must have [lon, lat]' });
        return;
      }
    }
    valid.push(row);
  });

  return { valid, errors };
}

export async function importBatch(
  rows: ParsedAssetRow[],
  utilityId: string,
  userId: string
): Promise<{ inserted: number; errors: Array<{ batch: number; message: string }> }> {
  let inserted = 0;
  const errors: Array<{ batch: number; message: string }> = [];
  const batchSize = 100;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const records = batch.map((row) => ({
      utility_id: utilityId,
      asset_type_id: row.assetTypeId || null,
      external_id: row.externalId,
      geometry: row.geometry
        ? knex.raw('ST_GeomFromGeoJSON(?)', [JSON.stringify(row.geometry)])
        : null,
      attributes: JSON.stringify(row.attributes || {}),
      status: row.status || 'active',
      condition_rating: row.conditionRating,
      install_date: row.installDate,
      material: row.material,
      diameter_mm: row.diameterMm,
      length_m: row.lengthM,
      depth_m: row.depthM,
      address: row.address,
      created_by: userId,
    }));

    try {
      await knex('assets').insert(records);
      inserted += records.length;
    } catch (err: any) {
      errors.push({ batch: Math.floor(i / batchSize), message: err.message });
    }
  }

  return { inserted, errors };
}

export const importQueue = new Queue('asset-imports', {
  connection: { url: env.REDIS_URL },
});
