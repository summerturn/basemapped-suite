/**
 * Geometry optimization utilities for vector tiles.
 * Reduces payload size through coordinate precision clamping,
 * attribute pruning, and per-zoom feature budgeting.
 */

export interface SimplificationSettings {
  coordinatePrecision: number;
  maxFeaturesPerTile: number;
  dropRate: number;
}

/** Minimum zoom level at which a property is retained in tiles. */
const PROPERTY_ZOOM_FLOOR: Record<string, number> = {
  name: 10,
  address: 12,
  city: 8,
  state: 6,
  zip: 10,
  category: 8,
  phone: 12,
  email: 12,
  website: 12,
};

// ---------------------------------------------------------------------------
// Attribute pruning
// ---------------------------------------------------------------------------

/**
 * Drop verbose properties at low zoom levels to keep tiles under 500 KB.
 */
export function pruneAttributes(
  properties: Record<string, unknown> | null,
  zoom: number
): Record<string, unknown> {
  const pruned: Record<string, unknown> = {};
  if (!properties) return pruned;

  for (const [key, value] of Object.entries(properties)) {
    const minZoom = PROPERTY_ZOOM_FLOOR[key] ?? 0;
    if (zoom >= minZoom && value !== undefined && value !== null) {
      pruned[key] = value;
    }
  }
  return pruned;
}

// ---------------------------------------------------------------------------
// Zoom-based simplification settings
// ---------------------------------------------------------------------------

export function simplifyForZoom(zoom: number): SimplificationSettings {
  if (zoom <= 4) {
    return { coordinatePrecision: 2, maxFeaturesPerTile: 5_000, dropRate: 0.8 };
  }
  if (zoom <= 8) {
    return {
      coordinatePrecision: 3,
      maxFeaturesPerTile: 10_000,
      dropRate: 0.5,
    };
  }
  if (zoom <= 12) {
    return {
      coordinatePrecision: 4,
      maxFeaturesPerTile: 20_000,
      dropRate: 0.2,
    };
  }
  return {
    coordinatePrecision: 6,
    maxFeaturesPerTile: 50_000,
    dropRate: 0,
  };
}

// ---------------------------------------------------------------------------
// Coordinate precision reduction
// ---------------------------------------------------------------------------

/**
 * Round lat/lng to reduce GeoJSON / tile payload size.
 */
export function reducePointPrecision(
  lat: number,
  lng: number,
  zoom: number
): [number, number] {
  const { coordinatePrecision } = simplifyForZoom(zoom);
  const factor = Math.pow(10, coordinatePrecision);
  return [
    Math.round(lat * factor) / factor,
    Math.round(lng * factor) / factor,
  ];
}

// ---------------------------------------------------------------------------
// SQL expression builders for raw queries
// ---------------------------------------------------------------------------

/**
 * Returns a JSONB-building SQL fragment string that prunes properties
 * according to zoom level. Must be interpolated into a template literal
 * **before** `$queryRaw` because Prisma does not allow raw SQL parameter
 * placeholders inside JSONB keys.
 *
 * SECURITY: `zoom` must be an integer; this function only uses it for
 * comparison literals, never for identifier names.
 */
export function buildPrunedPropertiesSql(
  zoom: number,
  column = "p.properties"
): string {
  const pairs: string[] = [
    `'id', ${column}->>'id'`,
    `'lat', ${column}->>'lat'`,
    `'lng', ${column}->>'lng'`,
  ];

  for (const [key, minZoom] of Object.entries(PROPERTY_ZOOM_FLOOR)) {
    pairs.push(
      `'${key}', CASE WHEN ${zoom} >= ${minZoom} THEN ${column}->>'${key}' END`
    );
  }

  return `jsonb_build_object(${pairs.join(", ")})`;
}
