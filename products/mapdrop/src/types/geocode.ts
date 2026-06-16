export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  address: string;
  normalizedAddress: string;
  lat: number;
  lng: number;
  source: "nominatim" | "locationiq" | "mapbox" | "cache";
  confidence?: number;
}

export interface GeocoderClient {
  name: string;
  geocode(address: string): Promise<GeocodeResult | null>;
}

export interface GeocodeJobData {
  mapId: string;
  address: string;
  recordId: string;
  jobId: string;
}

export type GeocodeJobStatusType =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "partial";

export interface GeocodeJobStatus {
  id: string;
  mapId: string;
  status: GeocodeJobStatusType;
  total: number;
  processed: number;
  failed: number;
  percentComplete: number;
  createdAt: Date;
  updatedAt: Date;
  errors?: string[];
}
