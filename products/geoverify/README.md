# GeoVerify

> Geospatial data verification platform. Validate, inspect, and monitor geospatial datasets through a modern API and interactive dashboard.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         GeoVerify Platform                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐        HTTP/REST        ┌──────────────────┐    │
│   │  Dashboard   │ ◄─────────────────────► │   API Service    │    │
│   │  (Next.js)   │                         │   (FastAPI)      │    │
│   │  Port 3000   │                         │   Port 8000      │    │
│   └──────────────┘                         └────────┬─────────┘    │
│                                                     │               │
│                              ┌──────────────────────┼──────┐       │
│                              │                      │      │       │
│                        ┌─────▼─────┐         ┌──────▼───┐  │       │
│                        │ PostgreSQL │         │  Redis   │  │       │
│                        │   Data    │         │  Cache   │  │       │
│                        │   Port    │         │  Queue   │  │       │
│                        │   5432    │         │  Port    │  │       │
│                        └───────────┘         │  6379    │  │       │
│                                              └──────────┘  │       │
│                                                            │       │
│   ┌────────────────────────────────────────────────────────┘       │
│   │   Packages                                                      │
│   │   ┌─────────────────────────────────────┐                       │
│   │   │   pytest-geospatial                 │                       │
│   │   │   Pytest plugin for geospatial      │                       │
│   │   │   assertions and validators         │                       │
│   │   └─────────────────────────────────────┘                       │
│   └─────────────────────────────────────────────────────────────────┘
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```text
geoverify/
├── apps/
│   ├── api/                  # FastAPI application
│   │   ├── geoverify_api/
│   │   │   ├── migrations/
│   │   │   ├── models/
│   │   │   ├── routers/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   └── workers/
│   │   ├── Dockerfile
│   │   └── fly.toml
│   └── dashboard/            # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── lib/
│       │   └── types/
│       └── fly.toml
├── packages/
│   └── pytest-geospatial/    # Pytest plugin package
├── docker-compose.yml
├── Makefile
└── .github/workflows/
```

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/)
- Node.js 20+ (for local dashboard development)
- Python 3.12+ (for local API/plugin development)

### 1. Clone and configure

```bash
git clone https://github.com/your-org/geoverify.git
cd geoverify
cp .env.example .env
# Edit .env with your secrets
```

### 2. Run the full stack

```bash
make dev
```

This starts:
- PostgreSQL 15 on [localhost:5432](http://localhost:5432)
- Redis 7 on [localhost:6379](http://localhost:6379)
- API on [http://localhost:8000](http://localhost:8000)
- Dashboard on [http://localhost:3000](http://localhost:3000)

### 3. Run migrations and seed data

```bash
make migrate
make seed
```

### 4. Explore

- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Dashboard: [http://localhost:3000](http://localhost:3000)

## Development Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start full Docker stack |
| `make dev-plugin` | Plugin development mode |
| `make dev-api` | API development mode with hot reload |
| `make dev-dashboard` | Dashboard development mode |
| `make test` | Run all test suites |
| `make lint` | Run all linters (ruff, mypy, ESLint, tsc) |
| `make build` | Build all Docker images |
| `make migrate` | Run Alembic database migrations |
| `make seed` | Seed the database with sample data |
| `make clean` | Stop containers, prune images, clear caches |

## Continuous Integration

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `plugin-ci.yml` | Push/PR to `main`/`develop` | Matrix test (3.9–3.12), ruff, mypy, coverage, PyPI publish on tags |
| `plugin-publish.yml` | Version tag `v*` | Trusted publishing to PyPI via OIDC |
| `dashboard-ci.yml` | Push/PR to `main`/`develop` | ESLint, TypeScript, Jest, Next.js build, Fly.io deploy on `main` |

## Deployment

### Fly.io

```bash
# API
cd apps/api
fly deploy

# Dashboard
cd apps/dashboard
fly deploy
```

### PyPI (Plugin)

Push a version tag to trigger trusted publishing:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Contributing

1. Fork the repository and create a feature branch (`git checkout -b feature/amazing-feature`)
2. Make your changes and add tests
3. Run `make test` and `make lint` to ensure quality
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
5. Open a Pull Request against `develop`

### Commit message format

```
feat(api): add batch verification endpoint
fix(dashboard): resolve map tile loading race condition
docs(readme): update quick start instructions
```

## License

MIT © GeoVerify Contributors
