"""Dataset API routes."""

import uuid
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geolint.database import get_db
from geolint.models import Dataset, Project
from geolint.schemas import DatasetCreate, DatasetResponse, DatasetPreview
from geolint.services.dataset_service import DatasetService

router = APIRouter()


async def get_dataset_service(db: AsyncSession = Depends(get_db)) -> DatasetService:
    return DatasetService(db)


@router.post("/datasets", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_dataset(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    service: DatasetService = Depends(get_dataset_service),
):
    """Upload a new dataset file."""
    dataset = await service.upload_and_create(
        project_id=uuid.UUID(project_id),
        filename=file.filename or "unnamed",
        content=await file.read(),
        content_type=file.content_type or "application/octet-stream",
    )
    return dataset


@router.get("/datasets", response_model=List[DatasetResponse])
async def list_datasets(
    project_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List datasets, optionally filtered by project."""
    query = select(Dataset)
    if project_id:
        query = query.where(Dataset.project_id == uuid.UUID(project_id))
    result = await db.execute(query.order_by(Dataset.created_at.desc()))
    return result.scalars().all()


@router.get("/datasets/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single dataset by ID."""
    result = await db.execute(select(Dataset).where(Dataset.id == uuid.UUID(dataset_id)))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.delete("/datasets/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: str,
    service: DatasetService = Depends(get_dataset_service),
):
    """Delete a dataset and its stored file."""
    await service.delete_dataset(uuid.UUID(dataset_id))
    return None


@router.get("/datasets/{dataset_id}/preview", response_model=DatasetPreview)
async def preview_dataset(
    dataset_id: str,
    service: DatasetService = Depends(get_dataset_service),
):
    """Return a preview of the dataset features."""
    preview = await service.get_preview(uuid.UUID(dataset_id))
    return preview
