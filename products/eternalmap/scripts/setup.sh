#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo " EternalMap - Local Development Setup"
echo "============================================"

# Check prerequisites
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "❌ $1 is required but not installed."
    exit 1
  fi
  echo "✅ $1 found"
}

echo "Checking prerequisites..."
check_command docker
check_command docker-compose
check_command pnpm
check_command node

# Copy .env if missing
if [ ! -f .env ]; then
  echo "Copying .env.example -> .env"
  cp .env.example .env
else
  echo "✅ .env already exists"
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Start Docker services
echo "Starting Docker services..."
docker-compose up -d --build

# Wait for postgres to be healthy
echo "Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U eternalmap -d eternalmap > /dev/null 2>&1; do
  sleep 1
done

# Run migrations
echo "Running database migrations..."
docker-compose exec -T server npx prisma migrate dev --name init --skip-generate || true
docker-compose exec -T server npx ts-node src/db/migrations/001_initial_schema.sql || true

# Seed database
echo "Seeding database..."
docker-compose exec -T server npx ts-node src/db/seed.ts || true

# Print URLs
echo ""
echo "============================================"
echo " 🎉 EternalMap is ready!"
echo "============================================"
echo " Web App:      http://localhost:3000"
echo " API Server:   http://localhost:3001"
echo " MinIO Console: http://localhost:9001"
echo " PostgreSQL:   localhost:5432"
echo " Redis:        localhost:6379"
echo "============================================"
