#!/bin/bash
set -e

echo "Waiting for all services to be ready..."

SERVICES=(
  "GeoVerify API:http://localhost:8001/health"
  "MapDrop:http://localhost:3001/api/health"
  "EternalMap API:http://localhost:3002/health"
  "GeoLint API:http://localhost:8002/health"
  "AquaMap API:http://localhost:3003/health"
)

for service in "${SERVICES[@]}"; do
  name="${service%%:*}"
  url="${service##*:}"
  attempts=0
  while ! curl -sf "$url" > /dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ $attempts -ge 30 ]; then
      echo "❌ $name did not become ready in time"
      exit 1
    fi
    echo "⏳ Waiting for $name... ($attempts/30)"
    sleep 2
  done
  echo "✅ $name is ready"
done

echo ""
echo "All services are ready!"
