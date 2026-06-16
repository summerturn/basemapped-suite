from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geoverify_api.database import get_db
from geoverify_api.models.daily_stats import DailyStats
from geoverify_api.models.test_run import TestRun
from geoverify_api.models.user import User
from geoverify_api.routers.auth import get_current_user
from geoverify_api.schemas.analytics import (
    AssertionBreakdown,
    AssertionBreakdownResponse,
    CoverageResponse,
    TrendData,
    TrendsResponse,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/trends/{project_id}", response_model=TrendsResponse)
async def get_trends(
    project_id: UUID,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(DailyStats)
        .where(DailyStats.project_id == project_id)
        .where(DailyStats.date >= since)
        .order_by(DailyStats.date)
    )
    stats = result.scalars().all()

    data = [
        TrendData(
            date=str(s.date),
            total_runs=s.total_runs,
            passed_runs=s.passed_runs,
            failed_runs=s.failed_runs,
            avg_duration_ms=s.avg_duration_ms,
        )
        for s in stats
    ]

    return TrendsResponse(project_id=project_id, days=days, data=data)


@router.get("/coverage/{project_id}", response_model=CoverageResponse)
async def get_coverage(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TestRun)
        .where(TestRun.project_id == project_id)
        .order_by(TestRun.created_at.desc())
        .limit(1)
    )
    latest_run = result.scalar_one_or_none()

    if not latest_run:
        return CoverageResponse(
            project_id=project_id,
            coverage_pct=None,
            total_assertions=0,
            passed_assertions=0,
        )

    total = latest_run.total_count
    passed = latest_run.passed_count
    coverage = (passed / total * 100) if total > 0 else None

    return CoverageResponse(
        project_id=project_id,
        coverage_pct=coverage,
        total_assertions=total,
        passed_assertions=passed,
    )


@router.get("/assertion-breakdown/{project_id}", response_model=AssertionBreakdownResponse)
async def get_assertion_breakdown(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TestRun)
        .where(TestRun.project_id == project_id)
        .order_by(TestRun.created_at.desc())
        .limit(1)
    )
    latest_run = result.scalar_one_or_none()

    if not latest_run:
        return AssertionBreakdownResponse(project_id=project_id, breakdown=[])

    breakdown = [
        AssertionBreakdown(status="passed", count=latest_run.passed_count),
        AssertionBreakdown(status="failed", count=latest_run.failed_count),
        AssertionBreakdown(status="skipped", count=latest_run.skipped_count),
    ]

    return AssertionBreakdownResponse(project_id=project_id, breakdown=breakdown)
