import type { ColumnMapping, ColumnType, GeocodeNeeded, ParseResult } from "@/types/dataset";

interface PatternRule {
  type: ColumnType;
  exact: string[];
  contains: string[];
  fuzzy: string[];
}

const RULES: PatternRule[] = [
  {
    type: "latitude",
    exact: ["lat", "latitude", "y", "lat_wgs84", "latitude_wgs84", "latitud", "breite", "latitudine"],
    contains: ["lat", "latitude", "breitengrad", "latitud"],
    fuzzy: ["latt", "latitiude", "lattitude", "laitude"],
  },
  {
    type: "longitude",
    exact: ["lng", "lon", "long", "longitude", "x", "lng_wgs84", "longitude_wgs84", "longitud", "länge", "longitudine"],
    contains: ["lng", "lon", "long", "longitude", "längengrad", "longitud"],
    fuzzy: ["longg", "longitiude", "longgitude", "longitudde", "lngitude"],
  },
  {
    type: "address",
    exact: ["address", "addr", "street", "street_address", "st_address", "adresse", "direccion", "indirizzo", "straat", "via", "rue"],
    contains: ["address", "street", "addr", "adresse", "direccion", "indirizzo", "straat"],
    fuzzy: ["adress", "addres", "adres", "streett", "streeet"],
  },
  {
    type: "city",
    exact: ["city", "town", "municipality", "stadt", "ciudad", "città", "ville", "stad", "ort"],
    contains: ["city", "town", "municipal", "stadt", "ciudad", "città"],
    fuzzy: ["citty", "ciy", "cityy", "cty"],
  },
  {
    type: "state",
    exact: ["state", "province", "region", "bundesland", "estado", "provincia", "regio", "regione", "état"],
    contains: ["state", "province", "region", "bundesland", "estado", "provincia"],
    fuzzy: ["statte", "stat", "statee", "provence", "provence"],
  },
  {
    type: "zip",
    exact: ["zip", "zipcode", "zip_code", "postal", "postal_code", "postcode", "plz", "codigo_postal", "cap", "code_postal", "postleitzahl"],
    contains: ["zip", "postal", "postcode", "plz", "codigo_postal", "postleitzahl"],
    fuzzy: ["zipcodee", "zipp", "postalcode", "posttcode"],
  },
  {
    type: "name",
    exact: ["name", "title", "label", "location_name", "place_name", "nom", "nombre", "nome", "naam", "bezeichnung"],
    contains: ["name", "title", "label", "place", "location", "bezeichnung"],
    fuzzy: ["nme", "namee", "titel", "lable"],
  },
  {
    type: "category",
    exact: ["category", "type", "kind", "group", "class", "categoria", "categorie", "kategorie", "tipo", "cat"],
    contains: ["category", "type", "kind", "group", "class", "kategorie", "categoria"],
    fuzzy: ["categroy", "catergory", "catgory", "categry"],
  },
];

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_\-\s\.]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function scoreHeader(header: string, rule: PatternRule): number {
  const norm = normalizeHeader(header);

  // Exact match
  for (const exact of rule.exact) {
    if (norm === normalizeHeader(exact)) return 100;
  }

  // Contains match
  for (const contains of rule.contains) {
    if (norm.includes(normalizeHeader(contains))) return 50;
  }

  // Fuzzy match (Levenshtein distance <= 2 for short words, <= 3 for longer)
  const allPatterns = [...rule.exact, ...rule.contains, ...rule.fuzzy];
  for (const pattern of allPatterns) {
    const dist = levenshtein(norm, normalizeHeader(pattern));
    const threshold = norm.length <= 4 ? 1 : norm.length <= 8 ? 2 : 3;
    if (dist <= threshold) return 25;
  }

  return 0;
}

export function detectColumns(parseResult: ParseResult): ColumnMapping[] {
  const { headers, columnTypes } = parseResult;
  const mappings: ColumnMapping[] = [];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    let bestScore = 0;
    let bestType: ColumnType = "unknown";

    for (const rule of RULES) {
      const score = scoreHeader(header, rule);
      if (score > bestScore) {
        bestScore = score;
        bestType = rule.type;
      }
    }

    // Boost confidence for numeric columns when lat/lng is suspected
    if ((bestType === "latitude" || bestType === "longitude") && columnTypes[header] === "number") {
      bestScore = Math.min(100, bestScore + 10);
    }

    mappings.push({
      columnIndex: i,
      header,
      detectedType: bestType,
      confidence: bestScore,
    });
  }

  return mappings;
}

export function checkGeocodeNeeded(mappings: ColumnMapping[]): GeocodeNeeded {
  const hasLat = mappings.some((m) => (m.userOverride ?? m.detectedType) === "latitude" && m.confidence >= 25);
  const hasLng = mappings.some((m) => (m.userOverride ?? m.detectedType) === "longitude" && m.confidence >= 25);
  const hasAddress = mappings.some((m) => (m.userOverride ?? m.detectedType) === "address" && m.confidence >= 25);
  const hasCity = mappings.some((m) => (m.userOverride ?? m.detectedType) === "city" && m.confidence >= 25);
  const hasState = mappings.some((m) => (m.userOverride ?? m.detectedType) === "state" && m.confidence >= 25);
  const hasZip = mappings.some((m) => (m.userOverride ?? m.detectedType) === "zip" && m.confidence >= 25);

  if (hasLat && hasLng) {
    return { needed: false, reason: "coordinates_found", missingFields: [] };
  }

  const addressFields: ColumnType[] = [];
  if (!hasAddress) addressFields.push("address");
  if (!hasCity) addressFields.push("city");
  if (!hasState) addressFields.push("state");
  if (!hasZip) addressFields.push("zip");

  if (hasAddress || hasCity) {
    return { needed: true, reason: "address_found", missingFields: addressFields };
  }

  return { needed: true, reason: "insufficient_data", missingFields: addressFields };
}
