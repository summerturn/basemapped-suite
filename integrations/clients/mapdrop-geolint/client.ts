import axios from 'axios';

export interface ValidationRequest {
  datasetUrl: string;
  mapId: string;
  ruleSet?: 'minimal' | 'standard' | 'strict';
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  grade: string;
  issues: Array<{
    ruleId: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    featureIndex?: number;
  }>;
  reportUrl: string;
}

const GEOLINT_BASE_URL = process.env.GEOLINT_API_URL || 'http://geolint-api:8000';

export class GeoLintClient {
  private api = axios.create({
    baseURL: GEOLINT_BASE_URL,
    timeout: 120000,
  });

  async validateDataset(req: ValidationRequest): Promise<ValidationResult> {
    const res = await this.api.post('/api/v1/validations', {
      dataset_url: req.datasetUrl,
      rule_set: req.ruleSet || 'standard',
      webhook_url: `${process.env.MAPDROP_WEBHOOK_URL}/geolint`,
    });
    const jobId = res.data.data.id;

    // Poll for completion
    let result;
    for (let i = 0; i < 60; i++) {
      const status = await this.api.get(`/api/v1/validations/${jobId}`);
      if (status.data.data.status === 'completed') {
        result = status.data.data;
        break;
      }
      if (status.data.data.status === 'failed') {
        throw new Error(`Validation failed: ${status.data.data.error}`);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!result) throw new Error('Validation timed out');

    return {
      valid: result.overall_score >= 70,
      score: result.overall_score,
      grade: result.grade,
      issues: [], // fetched separately if needed
      reportUrl: `${GEOLINT_BASE_URL}/api/v1/validations/${jobId}/report.html`,
    };
  }

  async quickValidateGeoJSON(geojson: any): Promise<{ valid: boolean; score: number; issues: any[] }> {
    const res = await this.api.post('/api/v1/validations/quick', {
      geojson,
      rule_set: 'minimal',
    });
    return res.data.data;
  }
}
