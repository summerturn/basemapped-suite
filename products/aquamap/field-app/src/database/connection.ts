import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, MIGRATIONS } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function openDB(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabaseAsync('aquamap_field.db');

  // Enable WAL mode for better concurrency
  await dbInstance.execAsync('PRAGMA journal_mode = WAL;');
  await dbInstance.execAsync('PRAGMA foreign_keys = ON;');

  // Run schema
  await dbInstance.execAsync(SCHEMA_SQL);

  // Run migrations
  for (const migration of MIGRATIONS) {
    await dbInstance.execAsync(migration);
  }

  return dbInstance;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

export async function exec(sql: string, params?: (string | number | null)[]): Promise<SQLite.SQLiteRunResult> {
  const db = await openDB();
  if (params && params.length > 0) {
    return db.runAsync(sql, params);
  }
  return db.runAsync(sql);
}

export async function query<T>(sql: string, params?: (string | number | null)[]): Promise<T[]> {
  const db = await openDB();
  return db.getAllAsync<T>(sql, params);
}

export async function getFirst<T>(sql: string, params?: (string | number | null)[]): Promise<T | null> {
  const db = await openDB();
  return db.getFirstAsync<T>(sql, params);
}

export function getDB(): SQLite.SQLiteDatabase | null {
  return dbInstance;
}
