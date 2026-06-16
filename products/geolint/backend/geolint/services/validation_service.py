"""Validation service: job creation, status tracking, result storage."""

import uuid as uuid_mod
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geolint.models import ValidationJob, Dataset, ValidationResult, Issue, JobStatus
from geolint.schemas import ValidationJobCreate, ValidationJobResponse


class ValidationService:
    """Service for validation job lifecycle."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_job(self, payload: ValidationJobCreate) -> ValidationJob:
        """Create a new validation job."""
        # Verify dataset exists
        result = await self.db.execute(
            select(Dataset).where(Dataset.id == payload.dataset_id)
        )
        dataset = result.scalar_one_or_none()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        job = ValidationJob(
            dataset_id=payload.dataset_id,
            rule_set=payload.rule_set,
            status=JobStatus.PENDING,
            progress_pct=0,
            webhook_url=payload.webhook_url,
        )
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def get_job(self, job_id: uuid_mod.UUID) -> Optional[ValidationJob]:
        """Fetch a validation job by ID."""
        result = await self.db.execute(
            select(ValidationJob).where(ValidationJob.id == job_id)
        )
        return result.scalar_one_or_none()

    async def update_status(
        self,
        job_id: uuid_mod.UUID,
        status: JobStatus,
        progress_pct: Optional[int] = None,
        overall_score: Optional[float] = None,
        grade: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Update validation job status."""
        result = await self.db.execute(
            select(ValidationJob).where(ValidationJob.id == job_id)
        )
        job = result.scalar_one_or_none()
        if not job:
            return

        job.status = status
        if progress_pct is not None:
            job.progress_pct = progress_pct
        if overall_score is not None:
            job.overall_score = overall_score
        if grade is not None:
            job.grade = grade
        if error_message is not None:
            job.error_message = error_message

        await self.db.commit()

    async def store_results(
        self,
        job_id: uuid_mod.UUID,
        results: List[dict],
    ) -> None:
        """Store validation results and issues."""
        for r in results:
            result = ValidationResult(
                job_id=job_id,
                rule_id=r["rule_id"],
                rule_name=r["rule_name"],
                category=r["category"],
                status=r["status"],
                score=r.get("score", 0.0),
                issue_count=r.get("issue_count", 0),
                details=r.get("details"),
            )
            self.db.add(result)
            await self.db.flush()

            for issue_data in r.get("issues", []):
                issue = Issue(
                    result_id=result.id,
                    feature_id=issue_data.get("feature_id"),
                    feature_index=issue_data.get("feature_index"),
                    issue_type=issue_data["issue_type"],
                    message=issue_data["message"],
                    severity=issue_data.get("severity", "medium"),
                    coordinates=issue_data.get("coordinates"),
                    suggested_fix=issue_data.get("suggested_fix"),
                )
                self.db.add(issue)

        await self.db.commit()
