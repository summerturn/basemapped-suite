#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== AquaMap Setup ==="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Please install Docker."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose not found. Please install Docker Compose."
    exit 1
fi

# Create .env if missing
if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        echo "Created .env from .env.example"
    else
        echo "Warning: .env.example not found. Create .env manually."
    fi
else
    echo ".env already exists."
fi

# Pull images
echo "Pulling images..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" pull

# Start services
echo "Starting services..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d

# Run migrations
echo "Running migrations..."
sleep 5
docker compose -f "$PROJECT_DIR/docker-compose.yml" exec backend npm run migrate || echo "Migration command failed or not configured."

# Seed data
echo "Seeding data..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" exec backend npm run seed || echo "Seed command failed or not configured."

echo "=== Setup Complete ==="
echo "Dashboard: http://localhost"
echo "API: http://localhost/api"
