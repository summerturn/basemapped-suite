import axios from 'axios';

const GEOVERIFY_BASE_URL = process.env.GEOVERIFY_API_URL || 'http://geoverify-api:8000';

export interface AssertionRequest {
  mapId: string;
  assertions: Array<{
    type: 'geometry_valid' | 'within_distance' | 'intersects' | 'area_within';
    params: Record<string, any>;
  }>;
}

export interface AssertionResult {
  passed: boolean;
  results: Array<{
    assertion: string;
    passed: boolean;
    message: string;
    featureCount: number;
    failures: Array<{ featureId: string; reason: string }>;
  }>;
}

export class GeoVerifyClient {
  private api = axios.create({
    baseURL: GEOVERIFY_BASE_URL,
    timeout: 30000,
  });

  async runAssertions(req: AssertionRequest): Promise<AssertionResult> {
    // Fetch map data from MapDrop's internal endpoint
    const mapData = await axios.get(
      `${process.env.MAPDROP_API_URL}/api/maps/${req.mapId}/export/geojson`
    );

    const res = await this.api.post('/api/v1/assertions/run', {
      geojson: mapData.data,
      assertions: req.assertions,
      project_id: req.mapId,
    });

    return res.data.data;
  }

  async validateGeometry(geojson: any): Promise<{ valid: boolean; errors: string[] }> {
    const res = await this.api.post('/api/v1/assertions/geometry-valid', { geojson });
    return res.data.data;
  }
}
