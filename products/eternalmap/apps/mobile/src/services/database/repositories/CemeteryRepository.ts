import { type DB } from '@op-engineering/op-sqlite';

export interface Cemetery {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  boundaryGeojson?: string;
  centerLat?: number;
  centerLng?: number;
  zoomLevel?: number;
  timezone?: string;
  tenantId?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  _syncStatus: string;
  _syncVersion: number;
  _localModifiedAt: number;
}

export class CemeteryRepository {
  constructor(private db: DB) {}

  findAll(includeDeleted: boolean = false): Cemetery[] {
    const sql = includeDeleted
      ? 'SELECT * FROM cemeteries ORDER BY name'
      : 'SELECT * FROM cemeteries WHERE deleted_at IS NULL ORDER BY name';
    const result = this.db.execute(sql);
    const rows: Cemetery[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(this.mapRow(result.rows.item(i)));
    }
    return rows;
  }

  findById(id: string): Cemetery | null {
    const result = this.db.execute('SELECT * FROM cemeteries WHERE id = ? AND deleted_at IS NULL', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows.item(0));
  }

  create(data: Omit<Cemetery, '_syncStatus' | '_syncVersion' | '_localModifiedAt' | 'createdAt' | 'updatedAt'> & Partial<Pick<Cemetery, 'createdAt' | 'updatedAt'>>): Cemetery {
    const now = Date.now();
    const cemetery: Cemetery = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
      _syncStatus: 'pending',
      _syncVersion: 1,
      _localModifiedAt: now,
    };

    this.db.execute(
      `INSERT INTO cemeteries (
        id, name, address, city, state, zip, country, phone, email, website,
        boundary_geojson, center_lat, center_lng, zoom_level, timezone, tenant_id,
        created_at, updated_at, deleted_at, _sync_status, _sync_version, _local_modified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cemetery.id, cemetery.name, cemetery.address ?? null, cemetery.city ?? null,
        cemetery.state ?? null, cemetery.zip ?? null, cemetery.country ?? 'US',
        cemetery.phone ?? null, cemetery.email ?? null, cemetery.website ?? null,
        cemetery.boundaryGeojson ?? null, cemetery.centerLat ?? null, cemetery.centerLng ?? null,
        cemetery.zoomLevel ?? 16, cemetery.timezone ?? 'America/New_York', cemetery.tenantId ?? null,
        cemetery.createdAt, cemetery.updatedAt, cemetery.deletedAt ?? null,
        cemetery._syncStatus, cemetery._syncVersion, cemetery._localModifiedAt,
      ]
    );

    return cemetery;
  }

  update(id: string, changes: Partial<Omit<Cemetery, 'id' | 'createdAt'>>): Cemetery | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = Date.now();
    const updates: Record<string, unknown> = {
      ...changes,
      updated_at: now,
      _sync_status: 'pending',
      _local_modified_at: now,
    };

    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return existing;

    const setClause = fields.map(f => `${this.toSnakeCase(f)} = ?`).join(', ');
    const values = fields.map(f => updates[f] ?? null);

    this.db.execute(`UPDATE cemeteries SET ${setClause} WHERE id = ?`, [...values, id]);

    return this.findById(id);
  }

  softDelete(id: string): boolean {
    const now = Date.now();
    this.db.execute(
      'UPDATE cemeteries SET deleted_at = ?, updated_at = ?, _sync_status = ?, _local_modified_at = ? WHERE id = ?',
      [now, now, 'pending', now, id]
    );
    return this.db.getRowsModified() > 0;
  }

  findWithinBounds(minLat: number, maxLat: number, minLng: number, maxLng: number): Cemetery[] {
    const result = this.db.execute(
      `SELECT * FROM cemeteries
       WHERE deleted_at IS NULL
         AND center_lat BETWEEN ? AND ?
         AND center_lng BETWEEN ? AND ?
       ORDER BY name`,
      [minLat, maxLat, minLng, maxLng]
    );
    const rows: Cemetery[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(this.mapRow(result.rows.item(i)));
    }
    return rows;
  }

  private mapRow(row: Record<string, unknown>): Cemetery {
    return {
      id: row.id as string,
      name: row.name as string,
      address: row.address as string | undefined,
      city: row.city as string | undefined,
      state: row.state as string | undefined,
      zip: row.zip as string | undefined,
      country: row.country as string | undefined,
      phone: row.phone as string | undefined,
      email: row.email as string | undefined,
      website: row.website as string | undefined,
      boundaryGeojson: row.boundary_geojson as string | undefined,
      centerLat: row.center_lat as number | undefined,
      centerLng: row.center_lng as number | undefined,
      zoomLevel: row.zoom_level as number | undefined,
      timezone: row.timezone as string | undefined,
      tenantId: row.tenant_id as string | undefined,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
      deletedAt: row.deleted_at as number | undefined,
      _syncStatus: row._sync_status as string,
      _syncVersion: row._sync_version as number,
      _localModifiedAt: row._local_modified_at as number,
    };
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
