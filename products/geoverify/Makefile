.PHONY: dev dev-plugin dev-api dev-dashboard test lint build migrate seed clean

# Full local development stack
dev:
	docker compose up --build

# Plugin-only development (Python)
dev-plugin:
	cd packages/pytest-geospatial && \
		pip install -e ".[dev]" && \
		python -m pytest --watch

# API-only development (Python/FastAPI)
dev-api:
	cd apps/api && \
		pip install -r requirements.txt && \
		uvicorn geoverify_api.main:app --host 0.0.0.0 --port 8000 --reload

# Dashboard-only development (Next.js)
dev-dashboard:
	cd apps/dashboard && \
		npm install && \
		npm run dev

# Run all tests
test:
	@echo "==> Running plugin tests"
	cd packages/pytest-geospatial && python -m pytest -v --cov=pytest_geospatial
	@echo "==> Running API tests"
	cd apps/api && python -m pytest -v
	@echo "==> Running dashboard tests"
	cd apps/dashboard && npm test

# Run all linters
lint:
	@echo "==> Linting plugin"
	cd packages/pytest-geospatial && ruff check src tests && mypy src
	@echo "==> Linting API"
	cd apps/api && ruff check geoverify_api tests && mypy geoverify_api
	@echo "==> Linting dashboard"
	cd apps/dashboard && npm run lint && npm run type-check

# Build all Docker images
build:
	docker compose build

# Run database migrations
migrate:
	@echo "==> Running API migrations"
	cd apps/api && alembic upgrade head

# Seed database with sample data
seed:
	@echo "==> Seeding database"
	cd apps/api && python -m scripts.seed

# Clean build artifacts, caches, and Docker resources
clean:
	docker compose down -v --remove-orphans
	docker system prune -f
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .next -exec rm -rf {} + 2>/dev/null || true
	rm -rf packages/pytest-geospatial/dist packages/pytest-geospatial/build packages/pytest-geospatial/*.egg-info
