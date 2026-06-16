import axios, { AxiosError, AxiosInstance } from 'axios'

const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://geolint-worker.summerlyntds.workers.dev/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message =
      (error.response?.data as { detail?: string })?.detail || error.message || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

export default client

// Client-side GeoJSON validator (used before upload)
export function validateGeoJSONClient(geojson: unknown): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  if (!geojson || typeof geojson !== 'object') {
    errors.push('GeoJSON must be an object')
    return { valid: false, errors, warnings }
  }

  const g = geojson as Record<string, unknown>

  if (!g.type) {
    errors.push('Missing "type" property')
  }

  const validTypes = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection', 'Feature', 'FeatureCollection']
  if (g.type && !validTypes.includes(g.type as string)) {
    errors.push(`Invalid type: "${g.type}". Must be one of: ${validTypes.join(', ')}`)
  }

  if (g.type === 'FeatureCollection') {
    if (!Array.isArray(g.features)) {
      errors.push('FeatureCollection must have a "features" array')
    } else {
      g.features.forEach((f: unknown, i: number) => {
        const feature = f as Record<string, unknown>
        if (feature.type !== 'Feature') {
          errors.push(`features[${i}]: must be a Feature`)
        }
        if (!feature.geometry) {
          errors.push(`features[${i}]: missing "geometry"`)
        }
      })
    }
  }

  if (g.type === 'Feature') {
    if (!g.geometry) {
      errors.push('Feature must have a "geometry" property')
    }
  }

  if (!g.bbox) {
    warnings.push('GeoJSON does not include a bbox property')
  }

  return { valid: errors.length === 0, errors, warnings }
}
