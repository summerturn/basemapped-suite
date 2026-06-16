export type ColumnType =
  | "latitude"
  | "longitude"
  | "address"
  | "city"
  | "state"
  | "zip"
  | "name"
  | "category"
  | "unknown";

export interface ColumnMapping {
  columnIndex: number;
  header: string;
  detectedType: ColumnType;
  confidence: number; // 0-100
  userOverride?: ColumnType;
}

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParseResult {
  headers: string[];
  previewRows: ParsedRow[];
  rowCount: number;
  columnTypes: Record<string, "string" | "number" | "date">;
  delimiter?: string;
  sheetName?: string;
  availableSheets?: string[];
  error?: string;
}

export type UploadPhase =
  | "idle"
  | "selecting"
  | "parsing"
  | "detecting"
  | "confirming"
  | "uploading"
  | "success"
  | "error";

export interface UploadState {
  phase: UploadPhase;
  file: File | null;
  parseResult: ParseResult | null;
  columnMappings: ColumnMapping[];
  progress: number; // 0-100
  error: string | null;
  mapId: string | null;
}

export interface GeocodeNeeded {
  needed: boolean;
  reason: "coordinates_found" | "address_found" | "insufficient_data";
  missingFields: ColumnType[];
}

export interface CreateMapPayload {
  fileName: string;
  columnMappings: ColumnMapping[];
  rows: ParsedRow[];
  geocode: GeocodeNeeded;
}

export interface MapRecord {
  id: string;
  name: string;
  fileName: string;
  rowCount: number;
  createdAt: string;
}
