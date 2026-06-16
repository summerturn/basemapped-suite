/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TableRecord {
  [key: string]: any;
}

class MockQueryBuilder {
  private table: string;
  private db: MockDatabase;
  private conditions: Array<Record<string, any>> = [];
  private _select: string[] | null = null;
  private _orderBy: { column: string; direction: 'asc' | 'desc' } | null = null;
  private _limit: number | null = null;

  constructor(table: string, db: MockDatabase) {
    this.table = table;
    this.db = db;
  }

  where(conditions: Record<string, any>) {
    this.conditions.push(conditions);
    return this;
  }

  whereRaw() {
    return this;
  }

  select(...cols: (string | any)[]) {
    this._select = cols.flat().map((c) => (typeof c === 'string' ? c : String(c)));
    return this;
  }

  orderBy(column: string, direction: 'asc' | 'desc' = 'asc') {
    this._orderBy = { column, direction };
    return this;
  }

  first() {
    const results = this._execute();
    return Promise.resolve(results[0] ?? null);
  }

  insert(records: TableRecord | TableRecord[]) {
    const arr = Array.isArray(records) ? records : [records];
    const inserted = arr.map((r) => {
      const id = r.id ?? crypto.randomUUID();
      const record = {
        ...r,
        id,
        created_at: r.created_at ?? new Date().toISOString(),
        updated_at: r.updated_at ?? new Date().toISOString(),
      };
      this.db._tables[this.table].push(record);
      return record;
    });
    return {
      returning: (cols: string | string[]) => {
        const arr = Array.isArray(cols) ? cols : [cols];
        return Promise.resolve(
          inserted.map((r) =>
            arr.includes('*')
              ? r
              : Object.fromEntries(arr.map((c) => [c, r[c]]))
          )
        );
      },
    };
  }

  update(data: TableRecord) {
    const records = this._execute();
    records.forEach((r) =>
      Object.assign(r, { ...data, updated_at: new Date().toISOString() })
    );
    return {
      returning: (cols: string | string[]) => {
        const arr = Array.isArray(cols) ? cols : [cols];
        return Promise.resolve(
          records.map((r) =>
            arr.includes('*')
              ? r
              : Object.fromEntries(arr.map((c) => [c, r[c]]))
          )
        );
      },
    };
  }

  del() {
    const records = this._execute();
    this.db._tables[this.table] = this.db._tables[this.table].filter(
      (r) => !records.includes(r)
    );
    return Promise.resolve(records.length);
  }

  private _execute() {
    let results = this.db._tables[this.table] ?? [];
    for (const cond of this.conditions) {
      results = results.filter((r) =>
        Object.entries(cond).every(([k, v]) => r[k] === v)
      );
    }
    if (this._orderBy) {
      results = [...results].sort((a, b) => {
        const aVal = a[this._orderBy!.column];
        const bVal = b[this._orderBy!.column];
        if (aVal < bVal) return this._orderBy!.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return this._orderBy!.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    if (this._limit) {
      results = results.slice(0, this._limit);
    }
    return results;
  }

  then(onFulfilled?: any, onRejected?: any) {
    let results = this._execute();
    if (this._select) {
      const hasRaw = this._select.some(
        (s) =>
          s.includes('ST_AsGeoJSON') ||
          s.includes(' as ') ||
          s.includes(' AS ')
      );
      if (!hasRaw) {
        results = results.map((r) =>
          Object.fromEntries(this._select!.map((c) => [c, r[c]]))
        );
      }
    }
    return Promise.resolve(results).then(onFulfilled, onRejected);
  }
}

class MockDatabase {
  _tables: Record<string, TableRecord[]> = {};

  reset() {
    this._tables = {};
  }

  seed(table: string, records: TableRecord[]) {
    this._tables[table] = records;
  }

  raw(sql: string, bindings?: any[]): Promise<any> {
    if (sql.includes('SELECT 1')) return Promise.resolve();
    if (sql.includes('fn_get_assets_in_radius')) {
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes('ST_AsGeoJSON')) {
      if (sql.includes('WHERE id = ?') && bindings) {
        const assets = this._tables['assets'] ?? [];
        const asset = assets.find((r) => r.id === bindings[0]);
        const geom = asset?.geometry ? JSON.stringify(asset.geometry) : null;
        return Promise.resolve({ rows: [{ g: geom }] });
      }
      return Promise.resolve({ rows: [{ geometry_json: null }] });
    }
    if (sql.includes('ST_MakeEnvelope')) {
      return Promise.resolve();
    }
    if (sql.includes('ST_GeomFromGeoJSON')) {
      return Promise.resolve();
    }
    return Promise.resolve({ rows: [] });
  }

  query(table: string) {
    if (!this._tables[table]) this._tables[table] = [];
    return new MockQueryBuilder(table, this);
  }
}

const mockDb = new MockDatabase();
const mockKnex = ((table: string) => mockDb.query(table)) as any;
mockKnex.raw = (sql: string, bindings?: any[]) => mockDb.raw(sql, bindings);

export { mockDb, mockKnex };
