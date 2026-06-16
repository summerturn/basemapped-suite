import axios from 'axios';

const MAPDROP_BASE_URL = process.env.MAPDROP_API_URL || 'http://mapdrop:3000';

export interface RenderRequest {
  utilityId: string;
  assetIds: string[];
  style?: 'default' | 'satellite' | 'utility';
}

export interface RenderResult {
  mapId: string;
  tileUrl: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  previewUrl: string;
}

export class MapDropRenderClient {
  private api = axios.create({
    baseURL: MAPDROP_BASE_URL,
    timeout: 30000,
  });

  async renderAssets(req: RenderRequest): Promise<RenderResult> {
    const res = await this.api.post('/api/integrations/render-assets', {
      utility_id: req.utilityId,
      asset_ids: req.assetIds,
      style: req.style || 'utility',
    });
    return res.data.data;
  }

  async createSharedMap(geojson: any, title: string): Promise<{ mapId: string; shareUrl: string }> {
    const res = await this.api.post('/api/maps', {
      title,
      geojson,
      is_public: false,
    });
    return {
      mapId: res.data.data.id,
      shareUrl: `${MAPDROP_BASE_URL}/maps/${res.data.data.id}`,
    };
  }
}
