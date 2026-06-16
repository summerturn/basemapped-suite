"""Report API routes."""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geolint.database import get_db
from geolint.models import ValidationJob, ValidationResult, Issue
from geolint.schemas import ReportSummary, ValidationResultResponse, IssueResponse

router = APIRouter()


@router.get("/validations/{validation_id}/report", response_model=ReportSummary)
async def get_report_json(
    validation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the validation report as JSON."""
    result = await db.execute(
        select(ValidationJob).where(ValidationJob.id == uuid.UUID(validation_id))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Validation job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Validation not yet completed")

    results_result = await db.execute(
        select(ValidationResult).where(ValidationResult.job_id == job.id)
    )
    results = results_result.scalars().all()

    issues_result = await db.execute(
        select(Issue).where(Issue.result_id.in_([r.id for r in results]))
    )
    issues = issues_result.scalars().all()

    issues_by_severity = {}
    issues_by_category = {}
    for issue in issues:
        issues_by_severity[issue.severity] = issues_by_severity.get(issue.severity, 0) + 1
    for r in results:
        issues_by_category[r.category] = issues_by_category.get(r.category, 0) + r.issue_count

    return ReportSummary(
        job_id=job.id,
        overall_score=job.overall_score or 0.0,
        grade=job.grade or "N/A",
        total_issues=len(issues),
        issues_by_severity=issues_by_severity,
        issues_by_category=issues_by_category,
        results=[ValidationResultResponse.model_validate(r) for r in results],
    )


@router.get("/validations/{validation_id}/report.pdf")
async def get_report_pdf(
    validation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Download the validation report as PDF."""
    result = await db.execute(
        select(ValidationJob).where(ValidationJob.id == uuid.UUID(validation_id))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Validation job not found")

    # In production, fetch pre-generated PDF from S3
    # Here we return a placeholder
    return Response(
        content=b"%PDF-1.4 placeholder",
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report-{validation_id}.pdf"},
    )


@router.get("/validations/{validation_id}/report.html")
async def get_report_html(
    validation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Download the validation report as HTML."""
    result = await db.execute(
        select(ValidationJob).where(ValidationJob.id == uuid.UUID(validation_id))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Validation job not found")

    html = f"""<!DOCTYPE html>
<html>
<head><title>Report {validation_id}</title></head>
<body>
<h1>GeoLint Validation Report</h1>
<p>Job ID: {validation_id}</p>
<p>Score: {job.overall_score}</p>
<p>Grade: {job.grade}</p>
</body>
</html>"""
    return Response(
        content=html,
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=report-{validation_id}.html"},
    )
