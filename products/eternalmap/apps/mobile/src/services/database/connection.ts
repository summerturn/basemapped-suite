import { open, type DB } from '@op-engineering/op-sqlite';

let dbInstance: DB | null = null;
let changeTrackingEnabled = false;

export function openDatabase(name: string = 'eternalmap.db'): DB {
  if (dbInstance && dbInstance.isOpen()) {
    return dbInstance;
  }

  dbInstance = open({
    name,
    inMemory: false,
    encryptionKey: undefined,
  });

  // Enable WAL mode for better concurrent performance
  dbInstance.execute('PRAGMA journal_mode = WAL;');
  dbInstance.execute('PRAGMA foreign_keys = ON;');

  return dbInstance;
}

export function getDatabase(): DB {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call openDatabase() first.');
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance && dbInstance.isOpen()) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function isOpen(): boolean {
  return dbInstance !== null && dbInstance.isOpen();
}

export function enableChangeTracking(enabled: boolean = true): void {
  changeTrackingEnabled = enabled;
  const db = getDatabase();
  db.execute(`
    CREATE TABLE IF NOT EXISTS _change_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      row_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
      changed_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );
  `);
  db.execute('CREATE INDEX IF NOT EXISTS idx_change_log_table_row ON _change_log(table_name, row_id);');
}

export function isChangeTrackingEnabled(): boolean {
  return changeTrackingEnabled;
}
