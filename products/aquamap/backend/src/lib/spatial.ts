export function parseGeoJSON(json: any): string {
  return JSON.stringify(json);
}

export function toGeoJSON(wkb: any): any {
  if (!wkb) return null;
  try {
    return JSON.parse(wkb);
  } catch {
    return null;
  }
}
