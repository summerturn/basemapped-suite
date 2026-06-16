import axios from 'axios';

const GEOLINT_BASE_URL = process.env.GEOLINT_API_URL || 'http://geolint-api:8000';

export interface ImportValidationRequest {
  fileKey: string;
  utilityId: string;
  importType: 'csv' | 'shapefile';
  ruleSet?: string;
}

export interface ImportValidationResult {
  valid: boolean;
  score: number;
  passedRows: number;
  failedRows: number;
  reportUrl: string;
  geometryIssues: Array<{ row: number; message: string }>;
}

export class GeoLintImportClient {
  private api = axios.create({
    baseURL: GEOLINT_BASE_URL,
    timeout: 180000,
  });

  async validateImport(req: ImportValidationRequest): Promise<ImportValidationResult> {
    // Step 1: Create a dataset from the S3 file
    const datasetRes = await this.api.post('/api/v1/datasets', {
      s3_key: req.fileKey,
      format: req.importType === 'csv' ? 'csv' : 'shapefile',
    });
    const datasetId = datasetRes.data.data.id;

    // Step 2: Run validation
    const validationRes = await this.api.post('/api/v1/validations', {
      dataset_id: datasetId,
      rule_set: req.ruleSet || 'standard',
    });
    const jobId = validationRes.data.data.id;

    // Poll
    let result;
    for (let i = 0; i < 60; i++) {
      const status = await this.api.get(`/api/v1/validations/${jobId}`);
      if (status.data.data.status === 'completed') {
        result = status.data.data;
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!result) throw new Error('Import validation timed out');

    return {
      valid: result.overall_score >= 70,
      score: result.overall_score,
      passedRows: result.feature_count - result.issue_count,
      failedRows: result.issue_count,
      reportUrl: `${GEOLINT_BASE_URL}/api/v1/validations/${jobId}/report.html`,
      geometryIssues: [],
    };
  }
}
