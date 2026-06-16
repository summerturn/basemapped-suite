#!/bin/bash
set -e

echo "=== Basemapped Integration Test Runner ==="

# Check if stack is running
if ! docker compose -f docker-compose.integrations.yml ps | grep -q "bm-"; then
  echo "Starting unified stack..."
  docker compose -f docker-compose.integrations.yml up -d
fi

./integrations/scripts/wait-for-services.sh

echo ""
echo "Running integration tests..."
docker compose -f docker-compose.integrations.yml --profile test run --rm integration-tests

echo ""
echo "=== Tests Complete ==="
