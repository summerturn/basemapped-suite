import { type DB } from '@op-engineering/op-sqlite';

export interface Photo {
  id: string;
  entityType: 'cemetery' | 'section' | 'plot' | 'grave' | 'person';
  entityId: string;
  filePath: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  caption?: string;
  isPrimary?: number;
  takenAt?: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  _syncStatus: string;
  _syncVersion: number;
  _localModifiedAt: number;
}

export class PhotoRepository {
  constructor(private db: DB) {}

  findByEntity(entityType: Photo['entityType'], entityId: string): Photo[] {
    const result = this.db.execute(
      'SELECT * FROM photos WHERE entity_type = ? AND entity_id = ? AND deleted_at IS NULL ORDER BY is_primary DESC, created_at DESC',
      [entityType, entityId]
    );
    return this.mapRows(result.rows);
  }

  findById(id: string): Photo | null {
    const result = this.db.execute(
      'SELECT * FROM photos WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows.item(0));
  }

  findPrimaryForEntity(entityType: Photo['entityType'], entityId: string): Photo | null {
    const result = this.db.execute(
      'SELECT * FROM photos WHERE entity_type = ? AND entity_id = ? AND is_primary = 1 AND deleted_at IS NULL LIMIT 1',
      [entityType, entityId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows.item(0));
  }

  create(data: Omit<Photo, '_syncStatus' | '_syncVersion' | '_localModifiedAt' | 'createdAt' | 'updatedAt'> & Partial<Pick<Photo, 'createdAt' | 'updatedAt'>>): Photo {
    const now = Date.now();
    const photo: Photo = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
      _syncStatus: 'pending',
      _syncVersion: 1,
      _localModifiedAt: now,
    };

    // If setting as primary, clear other primaries for same entity
    if (photo.isPrimary) {
      this.db.execute(
        'UPDATE photos SET is_primary = 0 WHERE entity_type = ? AND entity_id = ?',
        [photo.entityType, photo.entityId]
      );
    }

    this.db.execute(
      `INSERT INTO photos (
        id, entity_type, entity_id, file_path, file_name, mime_type,
        file_size, width, height, caption, is_primary, taken_at,
        created_at, updated_at, deleted_at, _sync_status, _sync_version, _local_modified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        photo.id, photo.entityType, photo.entityId, photo.filePath, photo.fileName,
        photo.mimeType ?? 'image/jpeg', photo.fileSize ?? null, photo.width ?? null,
        photo.height ?? null, photo.caption ?? null, photo.isPrimary ?? 0,
        photo.takenAt ?? null, photo.createdAt, photo.updatedAt, photo.deletedAt ?? null,
        photo._syncStatus, photo._syncVersion, photo._localModifiedAt,
      ]
    );

    return photo;
  }

  update(id: string, changes: Partial<Omit<Photo, 'id' | 'createdAt'>>): Photo | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = Date.now();
    const allowed = ['entityType', 'entityId', 'filePath', 'fileName', 'mimeType', 'fileSize', 'width', 'height', 'caption', 'isPrimary', 'takenAt'];
    const updates: Record<string, unknown> = {};

    for (const key of allowed) {
      if (key in changes) {
        updates[this.toSnakeCase(key)] = (changes as Record<string, unknown>)[key] ?? null;
      }
    }

    // Handle primary switch
    if (changes.isPrimary && existing.entityType && existing.entityId) {
      this.db.execute(
        'UPDATE photos SET is_primary = 0 WHERE entity_type = ? AND entity_id = ? AND id != ?',
        [existing.entityType, existing.entityId, id]
      );
    }

    updates.updated_at = now;
    updates._sync_status = 'pending';
    updates._local_modified_at = now;

    const fields = Object.keys(updates);
    if (fields.length === 0) return existing;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    this.db.execute(`UPDATE photos SET ${setClause} WHERE id = ?`, [...values, id]);
    return this.findById(id);
  }

  softDelete(id: string): boolean {
    const now = Date.now();
    this.db.execute(
      'UPDATE photos SET deleted_at = ?, updated_at = ?, _sync_status = ?, _local_modified_at = ? WHERE id = ?',
      [now, now, 'pending', now, id]
    );
    return this.db.getRowsModified() > 0;
  }

  private mapRows(rows: { length: number; item: (index: number) => Record<string, unknown> }): Photo[] {
    const out: Photo[] = [];
    for (let i = 0; i < rows.length; i++) {
      out.push(this.mapRow(rows.item(i)));
    }
    return out;
  }

  private mapRow(row: Record<string, unknown>): Photo {
    return {
      id: row.id as string,
      entityType: row.entity_type as Photo['entityType'],
      entityId: row.entity_id as string,
      filePath: row.file_path as string,
      fileName: row.file_name as string,
      mimeType: row.mime_type as string | undefined,
      fileSize: row.file_size as number | undefined,
      width: row.width as number | undefined,
      height: row.height as number | undefined,
      caption: row.caption as string | undefined,
      isPrimary: row.is_primary as number | undefined,
      takenAt: row.taken_at as number | undefined,
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
