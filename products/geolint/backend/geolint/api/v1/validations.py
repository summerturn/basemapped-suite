"""Validation API routes."""

import asyncio
import uuid
from typing import List, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from geolint.database import get_db
from geolint.models import ValidationJob, Dataset
from geolint.schemas import (
    ValidationJobCreate,
    ValidationJobResponse,
    ValidationProgressEvent,
)
from geolint.services.validation_service import ValidationService
from geolint.workers.validation_tasks import process_validation_job

router = APIRouter()


async def get_validation_service(db: AsyncSession = Depends(get_db)) -> ValidationService:
    return ValidationService(db)


@router.post("/validations", response_model=ValidationJobResponse, status_code=status.HTTP_201_CREATED)
async def create_validation(
    payload: ValidationJobCreate,
    service: ValidationService = Depends(get_validation_service),
):
    """Create and enqueue a new validation job."""
    job = await service.create_job(payload)
    process_validation_job.delay(str(job.id))
    return job


@router.get("/validations", response_model=List[ValidationJobResponse])
async def list_validations(
    dataset_id: str | None = None,
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List validation jobs."""
    query = select(ValidationJob)
    if dataset_id:
        query = query.where(ValidationJob.dataset_id == uuid.UUID(dataset_id))
    if status_filter:
        query = query.where(ValidationJob.status == status_filter)
    result = await db.execute(query.order_by(ValidationJob.created_at.desc()))
    return result.scalars().all()


@router.get("/validations/{validation_id}", response_model=ValidationJobResponse)
async def get_validation(
    validation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a validation job by ID."""
    result = await db.execute(
        select(ValidationJob).where(ValidationJob.id == uuid.UUID(validation_id))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Validation job not found")
    return job


async def progress_event_generator(validation_id: str, db: AsyncSession) -> AsyncGenerator[str, None]:
    """SSE generator for validation progress."""
    last_progress = -1
    last_status = ""
    max_iterations = 3600  # 1 hour at 1s intervals

    for _ in range(max_iterations):
        result = await db.execute(
            select(ValidationJob).where(ValidationJob.id == uuid.UUID(validation_id))
        )
        job = result.scalar_one_or_none()
        if not job:
            yield f"event: error\ndata: {{\"detail\": \"Job not found\"}}\n\n"
            break

        if job.progress_pct != last_progress or job.status != last_status:
            event = ValidationProgressEvent(
                job_id=job.id,
                progress_pct=job.progress_pct,
                status=job.status,
                message=f"Job is {job.status}",
            )
            yield f"data: {event.model_dump_json()}\n\n"
            last_progress = job.progress_pct
            last_status = job.status

        if job.status in ("completed", "failed", "cancelled"):
            yield f"event: done\ndata: {{\"status\": \"{job.status}\"}}\n\n"
            break

        await asyncio.sleep(1)
        await db.commit()  # refresh session


@router.get("/validations/{validation_id}/progress")
async def get_progress(
    validation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Stream validation progress via SSE."""
    return StreamingResponse(
        progress_event_generator(validation_id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
