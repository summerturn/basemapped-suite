"""Validation Celery tasks."""

import json
import os
import tempfile
import traceback
import uuid
from datetime import datetime

import boto3
from celery import shared_task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geolint.config.settings import settings
from geolint.database import AsyncSessionLocal
from geolint.models import ValidationJob, JobStatus, Dataset
from geolint.workers.events import publish_progress
from geolint.workers.webhook_tasks import send_webhook

# Assume core engine exists
from geolint.core import engine


def _get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL or None,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        region_name=settings.AWS_REGION,
    )


@shared_task(bind=True, max_retries=3)
def process_validation_job(self, validation_id: str):
    """Main validation task."""
    import asyncio
    asyncio.run(_async_process_validation_job(self, validation_id))


async def _async_process_validation_job(task_self, validation_id: str):
    """Async implementation of validation processing."""
    s3 = _get_s3_client()
    temp_path = None

    async with AsyncSessionLocal() as db:
        try:
            # 1. Fetch job
            result = await db.execute(
                select(ValidationJob).where(ValidationJob.id == uuid.UUID(validation_id))
            )
            job = result.scalar_one_or_none()
            if not job:
                raise ValueError(f"Validation job {validation_id} not found")

            # 2. Update status to running
            job.status = JobStatus.RUNNING
            job.progress_pct = 5
            await db.commit()
            await publish_progress(validation_id, 5, "running", "Job started")

            # 3. Download dataset from S3
            dataset_result = await db.execute(
                select(Dataset).where(Dataset.id == job.dataset_id)
            )
            dataset = dataset_result.scalar_one()

            suffix = os.path.splitext(dataset.name)[1] or ".dat"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                s3.download_fileobj(settings.S3_BUCKET, dataset.s3_path, tmp)
                temp_path = tmp.name

            job.progress_pct = 25
            await db.commit()
            await publish_progress(validation_id, 25, "running", "Dataset downloaded")

            # 4. Ingest via core engine (placeholder)
            # features = engine.ingest(temp_path, dataset.format)
            job.progress_pct = 40
            await db.commit()
            await publish_progress(validation_id, 40, "running", "Dataset ingested")

            # 5. Run all configured rules (placeholder)
            # results = engine.run_rules(features, job.rule_set)
            # Simulated results
            results = [
                {
                    "rule_id": "topology",
                    "rule_name": "Topology Validation",
                    "category": "geometry",
                    "status": "pass",
                    "score": 95.0,
                    "issue_count": 2,
                    "issues": [
                        {
                            "feature_id": "feat-1",
                            "feature_index": 0,
                            "issue_type": "self_intersection",
                            "message": "Self-intersection detected",
                            "severity": "high",
                            "coordinates": [-122.0, 37.0],
                            "suggested_fix": "Use buffer(0) to repair",
                        }
                    ],
                },
                {
                    "rule_id": "crs",
                    "rule_name": "CRS Consistency",
                    "category": "metadata",
                    "status": "pass",
                    "score": 100.0,
                    "issue_count": 0,
                    "issues": [],
                },
            ]

            job.progress_pct = 70
            await db.commit()
            await publish_progress(validation_id, 70, "running", "Rules executed")

            # 6. Calculate scores
            total_score = sum(r["score"] for r in results) / max(len(results), 1)
            grade = _score_to_grade(total_score)
            job.overall_score = total_score
            job.grade = grade

            # 7. Generate reports and upload to S3
            report_json = json.dumps({
                "job_id": validation_id,
                "score": total_score,
                "grade": grade,
                "results": results,
            })
            report_key = f"reports/{validation_id}/report.json"
            s3.put_object(
                Bucket=settings.S3_BUCKET,
                Key=report_key,
                Body=report_json.encode(),
                ContentType="application/json",
            )

            job.progress_pct = 85
            await db.commit()
            await publish_progress(validation_id, 85, "running", "Reports generated")

            # 8. Store results in DB
            from geolint.models import ValidationResult, Issue
            for r in results:
                vresult = ValidationResult(
                    job_id=job.id,
                    rule_id=r["rule_id"],
                    rule_name=r["rule_name"],
                    category=r["category"],
                    status=r["status"],
                    score=r.get("score", 0.0),
                    issue_count=r.get("issue_count", 0),
                    details=r.get("details"),
                )
                db.add(vresult)
                await db.flush()

                for issue_data in r.get("issues", []):
                    issue = Issue(
                        result_id=vresult.id,
                        feature_id=issue_data.get("feature_id"),
                        feature_index=issue_data.get("feature_index"),
                        issue_type=issue_data["issue_type"],
                        message=issue_data["message"],
                        severity=issue_data.get("severity", "medium"),
                        coordinates=issue_data.get("coordinates"),
                        suggested_fix=issue_data.get("suggested_fix"),
                    )
                    db.add(issue)

            # 9. Update job status to completed
            job.status = JobStatus.COMPLETED
            job.progress_pct = 100
            job.completed_at = datetime.utcnow()
            await db.commit()
            await publish_progress(validation_id, 100, "completed", "Validation complete")

            # 10. Send webhook notification
            if job.webhook_url:
                send_webhook.delay(
                    webhook_url=job.webhook_url,
                    payload={
                        "event": "validation.completed",
                        "job_id": validation_id,
                        "status": "completed",
                        "score": total_score,
                        "grade": grade,
                    },
                    secret=None,
                )

        except Exception as exc:
            await db.rollback()
            tb = traceback.format_exc()

            result = await db.execute(
                select(ValidationJob).where(ValidationJob.id == uuid.UUID(validation_id))
            )
            job = result.scalar_one_or_none()
            if job:
                job.status = JobStatus.FAILED
                job.progress_pct = 0
                job.error_message = str(exc)
                job.traceback = tb
                await db.commit()
                await publish_progress(validation_id, 0, "failed", str(exc))

                if job.webhook_url:
                    send_webhook.delay(
                        webhook_url=job.webhook_url,
                        payload={
                            "event": "validation.failed",
                            "job_id": validation_id,
                            "status": "failed",
                            "error": str(exc),
                        },
                        secret=None,
                    )

            raise self.retry(exc=exc, countdown=60)

        finally:
            # Cleanup temp files
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception:
                    pass


def _score_to_grade(score: float) -> str:
    if score >= 97:
        return "A+"
    elif score >= 93:
        return "A"
    elif score >= 90:
        return "A-"
    elif score >= 87:
        return "B+"
    elif score >= 83:
        return "B"
    elif score >= 80:
        return "B-"
    elif score >= 77:
        return "C+"
    elif score >= 73:
        return "C"
    elif score >= 70:
        return "C-"
    elif score >= 60:
        return "D"
    else:
        return "F"
