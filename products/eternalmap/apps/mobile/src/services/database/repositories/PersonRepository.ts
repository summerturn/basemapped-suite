import { type DB } from '@op-engineering/op-sqlite';

export interface Person {
  id: string;
  graveId?: string;
  plotId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  suffix?: string;
  dateOfBirth?: number;
  dateOfDeath?: number;
  dateOfBurial?: number;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  religion?: string;
  veteranStatus?: number;
  branchOfService?: string;
  rank?: string;
  bio?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  _syncStatus: string;
  _syncVersion: number;
  _localModifiedAt: number;
}

export class PersonRepository {
  constructor(private db: DB) {}

  findAll(): Person[] {
    const result = this.db.execute(
      'SELECT * FROM persons WHERE deleted_at IS NULL ORDER BY last_name, first_name'
    );
    return this.mapRows(result.rows);
  }

  findById(id: string): Person | null {
    const result = this.db.execute(
      'SELECT * FROM persons WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows.item(0));
  }

  findByGrave(graveId: string): Person[] {
    const result = this.db.execute(
      'SELECT * FROM persons WHERE grave_id = ? AND deleted_at IS NULL ORDER BY last_name, first_name',
      [graveId]
    );
    return this.mapRows(result.rows);
  }

  findByPlot(plotId: string): Person[] {
    const result = this.db.execute(
      'SELECT * FROM persons WHERE plot_id = ? AND deleted_at IS NULL ORDER BY last_name, first_name',
      [plotId]
    );
    return this.mapRows(result.rows);
  }

  create(data: Omit<Person, '_syncStatus' | '_syncVersion' | '_localModifiedAt' | 'createdAt' | 'updatedAt'> & Partial<Pick<Person, 'createdAt' | 'updatedAt'>>): Person {
    const now = Date.now();
    const person: Person = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
      _syncStatus: 'pending',
      _syncVersion: 1,
      _localModifiedAt: now,
    };

    this.db.execute(
      `INSERT INTO persons (
        id, grave_id, plot_id, first_name, middle_name, last_name, maiden_name,
        suffix, date_of_birth, date_of_death, date_of_burial, gender, religion,
        veteran_status, branch_of_service, rank, bio, created_at, updated_at, deleted_at,
        _sync_status, _sync_version, _local_modified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        person.id, person.graveId ?? null, person.plotId ?? null, person.firstName,
        person.middleName ?? null, person.lastName, person.maidenName ?? null,
        person.suffix ?? null, person.dateOfBirth ?? null, person.dateOfDeath ?? null,
        person.dateOfBurial ?? null, person.gender ?? null, person.religion ?? null,
        person.veteranStatus ?? 0, person.branchOfService ?? null, person.rank ?? null,
        person.bio ?? null, person.createdAt, person.updatedAt, person.deletedAt ?? null,
        person._syncStatus, person._syncVersion, person._localModifiedAt,
      ]
    );

    return person;
  }

  update(id: string, changes: Partial<Omit<Person, 'id' | 'createdAt'>>): Person | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = Date.now();
    const allowed = [
      'graveId', 'plotId', 'firstName', 'middleName', 'lastName', 'maidenName',
      'suffix', 'dateOfBirth', 'dateOfDeath', 'dateOfBurial', 'gender',
      'religion', 'veteranStatus', 'branchOfService', 'rank', 'bio',
    ];
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

    this.db.execute(`UPDATE persons SET ${setClause} WHERE id = ?`, [...values, id]);
    return this.findById(id);
  }

  softDelete(id: string): boolean {
    const now = Date.now();
    this.db.execute(
      'UPDATE persons SET deleted_at = ?, updated_at = ?, _sync_status = ?, _local_modified_at = ? WHERE id = ?',
      [now, now, 'pending', now, id]
    );
    return this.db.getRowsModified() > 0;
  }

  private mapRows(rows: { length: number; item: (index: number) => Record<string, unknown> }): Person[] {
    const out: Person[] = [];
    for (let i = 0; i < rows.length; i++) {
      out.push(this.mapRow(rows.item(i)));
    }
    return out;
  }

  private mapRow(row: Record<string, unknown>): Person {
    return {
      id: row.id as string,
      graveId: row.grave_id as string | undefined,
      plotId: row.plot_id as string | undefined,
      firstName: row.first_name as string,
      middleName: row.middle_name as string | undefined,
      lastName: row.last_name as string,
      maidenName: row.maiden_name as string | undefined,
      suffix: row.suffix as string | undefined,
      dateOfBirth: row.date_of_birth as number | undefined,
      dateOfDeath: row.date_of_death as number | undefined,
      dateOfBurial: row.date_of_burial as number | undefined,
      gender: row.gender as Person['gender'],
      religion: row.religion as string | undefined,
      veteranStatus: row.veteran_status as number | undefined,
      branchOfService: row.branch_of_service as string | undefined,
      rank: row.rank as string | undefined,
      bio: row.bio as string | undefined,
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
