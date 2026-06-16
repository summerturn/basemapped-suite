"""FastAPI app factory for GeoLint."""

import logging
import sys
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from geolint.config.settings import settings
from geolint.database import engine
from geolint.api.v1 import datasets, validations, reports, projects, teams, webhooks, rules


def configure_logging() -> None:
    """Configure structured logging."""
    log_format = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    logging.basicConfig(
        level=logging.INFO if not settings.DEBUG else logging.DEBUG,
        format=log_format,
        handlers=[logging.StreamHandler(sys.stdout)],
    )


configure_logging()
logger = logging.getLogger("geolint")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("GeoLint starting up...")
    yield
    logger.info("GeoLint shutting down...")
    await engine.dispose()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="GeoLint API",
        description="Geospatial data validation and quality scoring platform",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global exception handlers
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        logger.warning("ValueError: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": str(exc)},
        )

    # Health check
    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "healthy", "version": "1.0.0"}

    # API v1 routes
    app.include_router(datasets.router, prefix="/api/v1", tags=["datasets"])
    app.include_router(validations.router, prefix="/api/v1", tags=["validations"])
    app.include_router(reports.router, prefix="/api/v1", tags=["reports"])
    app.include_router(projects.router, prefix="/api/v1", tags=["projects"])
    app.include_router(teams.router, prefix="/api/v1", tags=["teams"])
    app.include_router(webhooks.router, prefix="/api/v1", tags=["webhooks"])
    app.include_router(rules.router, prefix="/api/v1", tags=["rules"])

    return app


app = create_app()
