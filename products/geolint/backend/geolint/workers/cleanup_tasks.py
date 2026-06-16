"""Periodic cleanup Celery tasks."""

import os
import shutil
from datetime import datetime, timedelta

from celery import shared_task
from sqlalchemy import select, delete

from geolint.database import AsyncSessionLocal
from geolint.models import ValidationJob, Dataset, JobStatus
from geolint.config.settings import settings


@shared_task
def cleanup_temp_files():
    """Remove temporary files older than 1 hour."""
    import asyncio
    asyncio.run(_cleanup_temp_files_async())


async def _cleanup_temp_files_async():
    temp_dir = settings.TEMP_DIR
    if not os.path.exists(temp_dir):
        return {"cleaned": 0}

    cutoff = datetime.utcnow() - timedelta(hours=1)
    cleaned = 0
    for root, dirs, files in os.walk(temp_dir):
        for f in files:
            path = os.path.join(root, f)
            try:
                mtime = datetime.utcfromtimestamp(os.path.getmtime(path))
                if mtime < cutoff:
                    os.unlink(path)
                    cleaned += 1
            except Exception:
                pass
        for d in dirs:
            path = os.path.join(root, d)
            try:
                if not os.listdir(path):
                    os.rmdir(path)
            except Exception:
                pass
    return {"cleaned": cleaned}


@shared_task
def archive_old_jobs():
    """Archive validation jobs older than 30 days."""
    import asyncio
    asyncio.run(_archive_old_jobs_async())


async def _archive_old_jobs_async():
    cutoff = datetime.utcnow() - timedelta(days=30)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ValidationJob).where(ValidationJob.created_at < cutoff)
        )
        jobs = result.scalars().all()
        archived = 0
        for job in jobs:
            # In production: move to archive table or S3
            job.status = JobStatus.CANCELLED  # placeholder
            archived += 1
        await db.commit()
    return {"archived": archived}


@shared_task
def cleanup_failed_uploads():
    """Remove datasets with error status older than 7 days."""
    import asyncio
    asyncio.run(_cleanup_failed_uploads_async())


async def _cleanup_failed_uploads_async():
    cutoff = datetime.utcnow() - timedelta(days=7)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Dataset).where(
                Dataset.status == "error",
                Dataset.created_at < cutoff,
            )
        )
        datasets = result.scalars().all()
        cleaned = 0
        for dataset in datasets:
            await db.delete(dataset)
            cleaned += 1
        await db.commit()
    return {"cleaned": cleaned}
