import axios from 'axios';

// Wait for all services to be healthy before running tests
const SERVICES = [
  { name: 'GeoVerify', url: process.env.GEOVERIFY_API_URL || 'http://localhost:8001', health: '/health' },
  { name: 'MapDrop', url: process.env.MAPDROP_API_URL || 'http://localhost:3001', health: '/api/health' },
  { name: 'EternalMap', url: process.env.ETERNALMAP_API_URL || 'http://localhost:3002', health: '/health' },
  { name: 'GeoLint', url: process.env.GEOLINT_API_URL || 'http://localhost:8002', health: '/health' },
  { name: 'AquaMap', url: process.env.AQUAMAP_API_URL || 'http://localhost:3003', health: '/health' },
];

export async function waitForServices(maxAttempts = 30) {
  for (const service of SERVICES) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        await axios.get(`${service.url}${service.health}`, { timeout: 2000 });
        console.log(`✅ ${service.name} is ready`);
        break;
      } catch {
        attempts++;
        if (attempts >= maxAttempts) throw new Error(`${service.name} did not become ready`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}
