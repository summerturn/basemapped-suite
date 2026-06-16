import { type DB } from '@op-engineering/op-sqlite';

export interface Grave {
  id: string;
  plotId?: string;
  sectionId?: string;
  cemeteryId: string;
  graveNumber?: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracy?: number;
  elevation?: number;
  status: 'occupied' | 'available' | 'reserved' | 'unknown';
  burialDate?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  _syncStatus: string;
  _syncVersion: number;
  _localModifiedAt: number;
}

export class GraveRepository {
  constructor(private db: DB) {}

  findByPlot(plotId: string): Grave[] {
    const result = this.db.execute(
      'SELECT * FROM graves WHERE plot_id = ? AND deleted_at IS NULL ORDER BY grave_number',
      [plotId]
    );
    return this.mapRows(result.rows);
  }

  findByCemetery(cemeteryId: string): Grave[] {
    const result = this.db.execute(
      'SELECT * FROM graves WHERE cemetery_id = ? AND deleted_at IS NULL ORDER BY grave_number',
      [cemeteryId]
    );
    return this.mapRows(result.rows);
  }

  findById(id: string): Grave | null {
    const result = this.db.execute(
      'SELECT * FROM graves WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows.item(0));
  }

  search(query: string): Grave[] {
    const like = `%${query}%`;
    const result = this.db.execute(
      `SELECT g.* FROM graves g
       LEFT JOIN persons p ON p.grave_id = g.id AND p.deleted_at IS NULL
       WHERE g.deleted_at IS NULL
         AND (g.grave_number LIKE ?
              OR g.notes LIKE ?
              OR p.first_name LIKE ?
              OR p.last_name LIKE ?)
       GROUP BY g.id
       ORDER BY g.grave_number
       LIMIT 100`,
      [like, like, like, like]
    );
    return this.mapRows(result.rows);
  }

  findNearby(lat: number, lng: number, radiusMeters: number): Grave[] {
    // Approximate degree distance: 1 deg lat ~ 111km, 1 deg lng ~ 111km * cos(lat)
    const latDelta = radiusMeters / 111000;
    const lngDelta = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));

    const result = this.db.execute(
      `SELECT *,
        (ABS(gps_lat - ?) * ABS(gps_lat - ?) + ABS(gps_lng - ?) * ABS(gps_lng - ?)) AS dist_approx
       FROM graves
       WHERE deleted_at IS NULL
         AND gps_lat BETWEEN ? AND ?
         AND gps_lng BETWEEN ? AND ?
       ORDER BY dist_approx
       LIMIT 100`,
      [
        lat, lat, lng, lng,
        lat - latDelta, lat + latDelta,
        lng - lngDelta, lng + lngDelta,
      ]
    );
    return this.mapRows(result.rows);
  }

  create(data: Omit<Grave, '_syncStatus' | '_syncVersion' | '_localModifiedAt' | 'createdAt' | 'updatedAt'> & Partial<Pick<Grave, 'createdAt' | 'updatedAt'>>, autoCaptureGps: boolean = false): Grave {
    const now = Date.now();
    const grave: Grave = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
      _syncStatus: 'pending',
      _syncVersion: 1,
      _localModifiedAt: now,
    };

    // GPS auto-capture placeholder: in real app, call Geolocation API here
    if (autoCaptureGps && (!grave.gpsLat || !grave.gpsLng)) {
      // These would be filled by the caller or a location service
      grave.gpsLat = data.gpsLat ?? 0;
      grave.gpsLng = data.gpsLng ?? 0;
      grave.gpsAccuracy = data.gpsAccuracy ?? 0;
    }

    this.db.execute(
      `INSERT INTO graves (
        id, plot_id, section_id, cemetery_id, grave_number,
        gps_lat, gps_lng, gps_accuracy, elevation, status,
        burial_date, notes, created_at, updated_at, deleted_at,
        _sync_status, _sync_version, _local_modified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        grave.id, grave.plotId ?? null, grave.sectionId ?? null, grave.cemeteryId,
        grave.graveNumber ?? null, grave.gpsLat ?? null, grave.gpsLng ?? null,
        grave.gpsAccuracy ?? null, grave.elevation ?? null, grave.status,
        grave.burialDate ?? null, grave.notes ?? null, grave.createdAt, grave.updatedAt,
        grave.deletedAt ?? null, grave._syncStatus, grave._syncVersion, grave._localModifiedAt,
      ]
    );

    return grave;
  }

  update(id: string, changes: Partial<Omit<Grave, 'id' | 'createdAt'>>): Grave | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = Date.now();
    const allowed = ['plotId', 'sectionId', 'cemeteryId', 'graveNumber', 'gpsLat', 'gpsLng', 'gpsAccuracy', 'elevation', 'status', 'burialDate', 'notes'];
    const updates: Record<string, unknown> = {};

    for (const key of allowed) {
      if (key in changes) {
        updates[this.toSnakeCase(key)] = (changes as Record<string, unknown>)[key] ?? null;
      }
    }

    updates.updated_at = now;
    updates._sync_status = 'pending';
    updates._local_modified_at = now;

    const fields = Object.keys(updates);
    if (fields.length === 0) return existing;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    this.db.execute(`UPDATE graves SET ${setClause} WHERE id = ?`, [...values, id]);
    return this.findById(id);
  }

  softDelete(id: string): boolean {
    const now = Date.now();
    this.db.execute(
      'UPDATE graves SET deleted_at = ?, updated_at = ?, _sync_status = ?, _local_modified_at = ? WHERE id = ?',
      [now, now, 'pending', now, id]
    );
    return this.db.getRowsModified() > 0;
  }

  private mapRows(rows: { length: number; item: (index: number) => Record<string, unknown> }): Grave[] {
    const out: Grave[] = [];
    for (let i = 0; i < rows.length; i++) {
      out.push(this.mapRow(rows.item(i)));
    }
    return out;
  }

  private mapRow(row: Record<string, unknown>): Grave {
    return {
      id: row.id as string,
      plotId: row.plot_id as string | undefined,
      sectionId: row.section_id as string | undefined,
      cemeteryId: row.cemetery_id as string,
      graveNumber: row.grave_number as string | undefined,
      gpsLat: row.gps_lat as number | undefined,
      gpsLng: row.gps_lng as number | undefined,
      gpsAccuracy: row.gps_accuracy as number | undefined,
      elevation: row.elevation as number | undefined,
      status: row.status as Grave['status'],
      burialDate: row.burial_date as number | undefined,
      notes: row.notes as string | undefined,
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
