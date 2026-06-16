import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const payload = JSON.stringify({
    dataset_url: 'https://example.com/test.geojson',
    rule_set: 'minimal',
  });

  const res = http.post('http://localhost:8002/api/v1/validations', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
}
