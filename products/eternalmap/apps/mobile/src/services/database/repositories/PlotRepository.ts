import { type DB } from '@op-engineering/op-sqlite';

export interface Plot {
  id: string;
  sectionId: string;
  cemeteryId: string;
  plotNumber: string;
  boundaryGeojson?: string;
  centerLat?: number;
  centerLng?: number;
  areaSqft?: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'unavailable';
  plotType?: string;
  maxOccupancy?: number;
  price?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  _syncStatus: string;
  _syncVersion: number;
  _localModifiedAt: number;
}

export class PlotRepository {
  constructor(private db: DB) {}

  findBySection(sectionId: string): Plot[] {
    const result = this.db.execute(
      'SELECT * FROM plots WHERE section_id = ? AND deleted_at IS NULL ORDER BY plot_number',
      [sectionId]
    );
    return this.mapRows(result.rows);
  }

  findByStatus(status: Plot['status']): Plot[] {
    const result = this.db.execute(
      'SELECT * FROM plots WHERE status = ? AND deleted_at IS NULL ORDER BY plot_number',
      [status]
    );
    return this.mapRows(result.rows);
  }

  findAvailable(): Plot[] {
    const result = this.db.execute(
      `SELECT * FROM plots
       WHERE status = 'available'
         AND deleted_at IS NULL
       ORDER BY plot_number`
    );
    return this.mapRows(result.rows);
  }

  findById(id: string): Plot | null {
    const result = this.db.execute(
      'SELECT * FROM plots WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows.item(0));
  }

  /**
   * Update plot status with double-sell prevention.
   * Returns the updated plot or null if the plot was not found.
   * Throws if attempting to sell an already occupied plot (and not forced).
   */
  updateStatus(id: string, newStatus: Plot['status'], options?: { force?: boolean; soldTo?: string }): Plot | null {
    const plot = this.findById(id);
    if (!plot) return null;

    // Double-sell prevention
    if (newStatus === 'occupied' && plot.status === 'occupied' && !options?.force) {
      throw new Error(`Plot ${id} is already occupied. Cannot double-sell.`);
    }

    const now = Date.now();
    this.db.execute(
      `UPDATE plots
       SET status = ?, updated_at = ?, _sync_status = ?, _local_modified_at = ?
       WHERE id = ?`,
      [newStatus, now, 'pending', now, id]
    );

    return this.findById(id);
  }

  countByStatus(): Record<Plot['status'], number> {
    const result = this.db.execute(
      `SELECT status, COUNT(*) as cnt
       FROM plots
       WHERE deleted_at IS NULL
       GROUP BY status`
    );
    const counts: Record<string, number> = {
      available: 0,
      occupied: 0,
      reserved: 0,
      maintenance: 0,
      unavailable: 0,
    };
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i) as { status: string; cnt: number };
      counts[row.status] = row.cnt;
    }
    return counts;
  }

  create(data: Omit<Plot, '_syncStatus' | '_syncVersion' | '_localModifiedAt' | 'createdAt' | 'updatedAt'> & Partial<Pick<Plot, 'createdAt' | 'updatedAt'>>): Plot {
    const now = Date.now();
    const plot: Plot = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
      _syncStatus: 'pending',
      _syncVersion: 1,
      _localModifiedAt: now,
    };

    this.db.execute(
      `INSERT INTO plots (
        id, section_id, cemetery_id, plot_number, boundary_geojson,
        center_lat, center_lng, area_sqft, status, plot_type, max_occupancy,
        price, notes, created_at, updated_at, deleted_at, _sync_status, _sync_version, _local_modified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plot.id, plot.sectionId, plot.cemeteryId, plot.plotNumber, plot.boundaryGeojson ?? null,
        plot.centerLat ?? null, plot.centerLng ?? null, plot.areaSqft ?? null,
        plot.status, plot.plotType ?? 'standard', plot.maxOccupancy ?? 1,
        plot.price ?? null, plot.notes ?? null, plot.createdAt, plot.updatedAt,
        plot.deletedAt ?? null, plot._syncStatus, plot._syncVersion, plot._localModifiedAt,
      ]
    );

    return plot;
  }

  update(id: string, changes: Partial<Omit<Plot, 'id' | 'createdAt'>>): Plot | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = Date.now();
    const allowed = ['sectionId', 'cemeteryId', 'plotNumber', 'boundaryGeojson', 'centerLat', 'centerLng', 'areaSqft', 'status', 'plotType', 'maxOccupancy', 'price', 'notes'];
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

    this.db.execute(`UPDATE plots SET ${setClause} WHERE id = ?`, [...values, id]);
    return this.findById(id);
  }

  softDelete(id: string): boolean {
    const now = Date.now();
    this.db.execute(
      'UPDATE plots SET deleted_at = ?, updated_at = ?, _sync_status = ?, _local_modified_at = ? WHERE id = ?',
      [now, now, 'pending', now, id]
    );
    return this.db.getRowsModified() > 0;
  }

  private mapRows(rows: { length: number; item: (index: number) => Record<string, unknown> }): Plot[] {
    const out: Plot[] = [];
    for (let i = 0; i < rows.length; i++) {
      out.push(this.mapRow(rows.item(i)));
    }
    return out;
  }

  private mapRow(row: Record<string, unknown>): Plot {
    return {
      id: row.id as string,
      sectionId: row.section_id as string,
      cemeteryId: row.cemetery_id as string,
      plotNumber: row.plot_number as string,
      boundaryGeojson: row.boundary_geojson as string | undefined,
      centerLat: row.center_lat as number | undefined,
      centerLng: row.center_lng as number | undefined,
      areaSqft: row.area_sqft as number | undefined,
      status: row.status as Plot['status'],
      plotType: row.plot_type as string | undefined,
      maxOccupancy: row.max_occupancy as number | undefined,
      price: row.price as number | undefined,
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
