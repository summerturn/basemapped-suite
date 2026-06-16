from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from geoverify_api.database import Base, engine
from geoverify_api.routers import analytics, assertions, auth, projects, test_runs, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="GeoVerify API",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(projects.router)
    app.include_router(test_runs.router)
    app.include_router(assertions.router)
    app.include_router(analytics.router)
    app.include_router(webhooks.router)

    @app.get("/health")
    async def health_check():
        return {"status": "healthy"}

    return app


app = create_app()
