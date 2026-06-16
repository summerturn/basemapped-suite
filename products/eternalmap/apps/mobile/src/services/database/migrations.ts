import { type DB } from '@op-engineering/op-sqlite';
import { CURRENT_SCHEMA_VERSION } from './schema';

export interface Migration {
  version: number;
  description: string;
  up: (db: DB) => void;
}

export function getCurrentVersion(db: DB): number {
  try {
    const result = db.execute('SELECT version FROM schema_version LIMIT 1');
    if (result.rows && result.rows.length > 0) {
      return (result.rows.item(0) as { version: number }).version;
    }
  } catch {
    // schema_version table might not exist yet
  }
  return 0;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema with cemeteries, sections, plots, graves, persons, photos, documents, sync_queue, app_settings',
    up: (db) => {
      db.execute(`
        CREATE TABLE IF NOT EXISTS cemeteries (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT,
          city TEXT,
          state TEXT,
          zip TEXT,
          country TEXT DEFAULT 'US',
          phone TEXT,
          email TEXT,
          website TEXT,
          boundary_geojson TEXT,
          center_lat REAL,
          center_lng REAL,
          zoom_level INTEGER DEFAULT 16,
          timezone TEXT DEFAULT 'America/New_York',
          tenant_id TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER,
          _sync_status TEXT NOT NULL DEFAULT 'pending',
          _sync_version INTEGER NOT NULL DEFAULT 1,
          _local_modified_at INTEGER DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE TABLE IF NOT EXISTS sections (
          id TEXT PRIMARY KEY,
          cemetery_id TEXT NOT NULL REFERENCES cemeteries(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          code TEXT,
          boundary_geojson TEXT,
          center_lat REAL,
          center_lng REAL,
          area_sqft REAL,
          notes TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER,
          _sync_status TEXT NOT NULL DEFAULT 'pending',
          _sync_version INTEGER NOT NULL DEFAULT 1,
          _local_modified_at INTEGER DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE TABLE IF NOT EXISTS plots (
          id TEXT PRIMARY KEY,
          section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
          cemetery_id TEXT NOT NULL REFERENCES cemeteries(id) ON DELETE CASCADE,
          plot_number TEXT NOT NULL,
          boundary_geojson TEXT,
          center_lat REAL,
          center_lng REAL,
          area_sqft REAL,
          status TEXT NOT NULL DEFAULT 'available',
          plot_type TEXT DEFAULT 'standard',
          max_occupancy INTEGER DEFAULT 1,
          price REAL,
          notes TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER,
          _sync_status TEXT NOT NULL DEFAULT 'pending',
          _sync_version INTEGER NOT NULL DEFAULT 1,
          _local_modified_at INTEGER DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE TABLE IF NOT EXISTS graves (
          id TEXT PRIMARY KEY,
          plot_id TEXT REFERENCES plots(id) ON DELETE SET NULL,
          section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
          cemetery_id TEXT NOT NULL REFERENCES cemeteries(id) ON DELETE CASCADE,
          grave_number TEXT,
          gps_lat REAL,
          gps_lng REAL,
          gps_accuracy REAL,
          elevation REAL,
          status TEXT NOT NULL DEFAULT 'unknown',
          burial_date INTEGER,
          notes TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER,
          _sync_status TEXT NOT NULL DEFAULT 'pending',
          _sync_version INTEGER NOT NULL DEFAULT 1,
          _local_modified_at INTEGER DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE TABLE IF NOT EXISTS persons (
          id TEXT PRIMARY KEY,
          grave_id TEXT REFERENCES graves(id) ON DELETE SET NULL,
          plot_id TEXT REFERENCES plots(id) ON DELETE SET NULL,
          first_name TEXT NOT NULL,
          middle_name TEXT,
          last_name TEXT NOT NULL,
          maiden_name TEXT,
          suffix TEXT,
          date_of_birth INTEGER,
          date_of_death INTEGER,
          date_of_burial INTEGER,
          gender TEXT,
          religion TEXT,
          veteran_status INTEGER DEFAULT 0,
          branch_of_service TEXT,
          rank TEXT,
          bio TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER,
          _sync_status TEXT NOT NULL DEFAULT 'pending',
          _sync_version INTEGER NOT NULL DEFAULT 1,
          _local_modified_at INTEGER DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE TABLE IF NOT EXISTS photos (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_name TEXT NOT NULL,
          mime_type TEXT DEFAULT 'image/jpeg',
          file_size INTEGER,
          width INTEGER,
          height INTEGER,
          caption TEXT,
          is_primary INTEGER DEFAULT 0,
          taken_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER,
          _sync_status TEXT NOT NULL DEFAULT 'pending',
          _sync_version INTEGER NOT NULL DEFAULT 1,
          _local_modified_at INTEGER DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_name TEXT NOT NULL,
          mime_type TEXT,
          file_size INTEGER,
          document_type TEXT,
          title TEXT,
          description TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER,
          _sync_status TEXT NOT NULL DEFAULT 'pending',
          _sync_version INTEGER NOT NULL DEFAULT 1,
          _local_modified_at INTEGER DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          data_json TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          retry_count INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
          updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at INTEGER DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE INDEX IF NOT EXISTS idx_sections_cemetery ON sections(cemetery_id);
        CREATE INDEX IF NOT EXISTS idx_plots_section ON plots(section_id);
        CREATE INDEX IF NOT EXISTS idx_plots_cemetery ON plots(cemetery_id);
        CREATE INDEX IF NOT EXISTS idx_plots_status ON plots(status);
        CREATE INDEX IF NOT EXISTS idx_plots_center ON plots(center_lat, center_lng);
        CREATE INDEX IF NOT EXISTS idx_graves_plot ON graves(plot_id);
        CREATE INDEX IF NOT EXISTS idx_graves_cemetery ON graves(cemetery_id);
        CREATE INDEX IF NOT EXISTS idx_graves_location ON graves(gps_lat, gps_lng);
        CREATE INDEX IF NOT EXISTS idx_persons_grave ON persons(grave_id);
        CREATE INDEX IF NOT EXISTS idx_persons_names ON persons(last_name, first_name);
        CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, retry_count);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_table_record ON sync_queue(table_name, record_id);

        CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
          content, entity_type, entity_id, content='', content_rowid='rowid'
        );

        INSERT OR IGNORE INTO schema_version (version) VALUES (1);
        INSERT OR IGNORE INTO app_settings (key, value) VALUES ('last_sync_timestamp', '0');
        INSERT OR IGNORE INTO app_settings (key, value) VALUES ('theme', 'system');
        INSERT OR IGNORE INTO app_settings (key, value) VALUES ('sync_enabled', 'true');
        INSERT OR IGNORE INTO app_settings (key, value) VALUES ('map_style', 'satellite');
      `);
    },
  },
  {
    version: 2,
    description: 'Add sync metadata columns and improve indexing for offline sync performance',
    up: (db) => {
      db.execute(`
        CREATE INDEX IF NOT EXISTS idx_cemeteries_sync ON cemeteries(_sync_status);
        CREATE INDEX IF NOT EXISTS idx_sections_sync ON sections(_sync_status);
        CREATE INDEX IF NOT EXISTS idx_plots_sync ON plots(_sync_status);
        CREATE INDEX IF NOT EXISTS idx_graves_sync ON graves(_sync_status);
        CREATE INDEX IF NOT EXISTS idx_persons_sync ON persons(_sync_status);
        CREATE INDEX IF NOT EXISTS idx_photos_sync ON photos(_sync_status);
        CREATE INDEX IF NOT EXISTS idx_documents_sync ON documents(_sync_status);

        CREATE INDEX IF NOT EXISTS idx_cemeteries_deleted ON cemeteries(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_sections_deleted ON sections(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_plots_deleted ON plots(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_graves_deleted ON graves(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_persons_deleted ON persons(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_photos_deleted ON photos(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_documents_deleted ON documents(deleted_at);
      `);
    },
  },
];

export function migrate(db: DB, toVersion: number = CURRENT_SCHEMA_VERSION): void {
  const currentVersion = getCurrentVersion(db);

  if (currentVersion >= toVersion) {
    return;
  }

  db.execute('BEGIN TRANSACTION;');

  try {
    for (const migration of migrations) {
      if (migration.version > currentVersion && migration.version <= toVersion) {
        migration.up(db);
        db.execute(
          'INSERT OR REPLACE INTO schema_version (version) VALUES (?)',
          [migration.version]
        );
      }
    }

    db.execute('COMMIT;');
  } catch (error) {
    db.execute('ROLLBACK;');
    throw error;
  }
}

export function resetDatabase(db: DB): void {
  db.execute('BEGIN TRANSACTION;');
  try {
    const tables = [
      'documents', 'photos', 'persons', 'graves', 'plots', 'sections', 'cemeteries',
      'sync_queue', 'app_settings', 'schema_version', 'search_index', '_change_log'
    ];
    for (const table of tables) {
      db.execute(`DROP TABLE IF EXISTS ${table}`);
    }
    db.execute('COMMIT;');
  } catch (error) {
    db.execute('ROLLBACK;');
    throw error;
  }
}
