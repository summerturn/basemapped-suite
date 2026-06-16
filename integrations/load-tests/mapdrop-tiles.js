import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 50,
  duration: '60s',
};

export default function () {
  const z = Math.floor(Math.random() * 5) + 10;
  const x = Math.floor(Math.random() * 100);
  const y = Math.floor(Math.random() * 100);

  const res = http.get(`http://localhost:3001/api/maps/test-map/tile/${z}/${x}/${y}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
