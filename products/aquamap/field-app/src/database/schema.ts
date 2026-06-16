import { SQLiteDatabase } from 'expo-sqlite';

export interface AssetRecord {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  address: string;
  status: string;
  properties: string;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export interface InspectionRecord {
  id: string;
  asset_id: string;
  type: string;
  status: string;
  due_date: string;
  completed_at: string | null;
  inspector_id: string | null;
  form_data: string;
  photos: string;
  signature: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export interface WorkOrderRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string;
  asset_id: string;
  clock_in: string | null;
  clock_out: string | null;
  parts_used: string;
  photos_before: string;
  photos_after: string;
  notes: string | null;
  signature: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      properties TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY NOT NULL,
      asset_id TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      due_date TEXT,
      completed_at TEXT,
      inspector_id TEXT,
      form_data TEXT,
      photos TEXT,
      signature TEXT,
      gps_lat REAL,
      gps_lon REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      assigned_to TEXT,
      asset_id TEXT,
      clock_in TEXT,
      clock_out TEXT,
      parts_used TEXT,
      photos_before TEXT,
      photos_after TEXT,
      notes TEXT,
      signature TEXT,
      gps_lat REAL,
      gps_lon REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pending_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_pulled_at TEXT,
      last_pushed_at TEXT,
      is_syncing INTEGER NOT NULL DEFAULT 0,
      pending_count INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO sync_state (id) VALUES (1);
  `);
}
