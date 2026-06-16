# Basemapped Geospatial SaaS — Testing Strategy

## Overview

This document describes how to test the entire 5-product geospatial SaaS toolbase, from individual unit tests to full cross-product integration tests.

---

## 1. Testing Pyramid

```
        ▲
       /  \
      / E2E \        Playwright browser tests (rare)
     /________\
    /          \
   / Integration \   Cross-product API tests (docker-compose.integrations.yml)
  /______________\
 /                \
/    Unit Tests    \  Product-internal tests (pytest, vitest, jest)
/__________________\
```

---

## 2. Unit Tests (Per Product)

### GeoVerify
```bash
cd geoverify/packages/pytest-geospatial
pip install -e ".[dev]"
pytest --cov=pytest_geospatial -v
```
**Expected:** 60+ tests passing

### GeoLint
```bash
cd geolint/backend
pip install -e ".[dev]"
pytest -v
```
**Expected:** 83+ tests passing

### AquaMap Backend
```bash
cd aquamap/backend
npm install
npm run test:run
```
**Expected:** Auth, asset, work-order tests passing

### MapDrop
```bash
cd mapdrop
npm install
npx prisma migrate dev
npm test
```

### EternalMap Server
```bash
cd eternalmap/apps/server
npm install
npm test
```

---

## 3. Integration Tests (Cross-Product)

### Quick Start
```bash
# Start the unified stack
docker compose -f docker-compose.integrations.yml up -d

# Wait for all services (approx 60 seconds)
./integrations/scripts/wait-for-services.sh

# Run integration tests
docker compose -f docker-compose.integrations.yml --profile test run --rm integration-tests
```

### What's Tested
| Test | Description |
|------|-------------|
| Health Checks | All 5 APIs respond to /health |
| GeoLint → MapDrop | Upload validation bridge |
| GeoLint → AquaMap | Asset import validation bridge |
| MapDrop → GeoVerify | Spatial assertion runner |
| AquaMap → MapDrop | Asset tile rendering |
| Shared Postgres | All services connect to same DB |
| Shared Redis | Queue services use same Redis |

### Manual Testing
```bash
# Test GeoLint validates a MapDrop upload
curl -X POST http://localhost:3001/api/integrations/validate \
  -H "Content-Type: application/json" \
  -d '{"datasetUrl":"http://mapdrop:3000/api/maps/123/export/geojson","mapId":"123"}'

# Test AquaMap renders on MapDrop
curl -X POST http://localhost:3001/api/integrations/render-assets \
  -H "Content-Type: application/json" \
  -d '{"utility_id":"uuid","asset_ids":["uuid"],"style":"utility"}'

# Test GeoVerify asserts MapDrop data
curl -X POST http://localhost:8001/integrations/mapdrop/assert \
  -H "Content-Type: application/json" \
  -d '{"mapId":"123","assertions":[{"type":"geometry_valid"}]}'
```

---

## 4. End-to-End Tests

### Prerequisites
```bash
cd integrations/tests
npm install
npx playwright install
```

### Run E2E
```bash
npm run test:e2e
```

### E2E Scenarios
1. **Upload → Validate → Map Flow**
   - Upload GeoJSON to MapDrop
   - GeoLint auto-validates
   - View map with quality score overlay

2. **Asset Import → Inspect → Report Flow**
   - Import assets to AquaMap
   - GeoLint validates geometry
   - Create inspection → work order → compliance report

3. **Cemetery Search → Sync → Report Flow**
   - Search graves in EternalMap mobile
   - Sync to server
   - Generate occupancy report on web dashboard

---

## 5. Load Testing

```bash
# Install k6
brew install k6

# Run load test against GeoLint validation API
k6 run --vus 10 --duration 30s integrations/load-tests/geolint-validation.js

# Run load test against MapDrop tile endpoint
k6 run --vus 50 --duration 60s integrations/load-tests/mapdrop-tiles.js
```

---

## 6. CI/CD Testing

Each product has its own GitHub Actions workflow. For the unified stack:

```yaml
# .github/workflows/integration.yml
name: Cross-Product Integration Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start unified stack
        run: docker compose -f docker-compose.integrations.yml up -d
      - name: Wait for services
        run: sleep 60
      - name: Run integration tests
        run: docker compose -f docker-compose.integrations.yml --profile test run --rm integration-tests
```

---

## 7. Testing Checklist Before Launch

- [ ] All unit tests pass (GeoVerify: 60+, GeoLint: 83+, AquaMap: 10+)
- [ ] Integration health checks pass for all 5 services
- [ ] Cross-product API bridges respond correctly
- [ ] Docker Compose unified stack starts cleanly
- [ ] Database migrations run successfully
- [ ] Redis queues process jobs without errors
- [ ] MinIO file uploads/downloads work
- [ ] E2E critical path flows complete successfully
- [ ] Load tests meet SLA targets (< 200ms p95 for tiles, < 5s for validation)
