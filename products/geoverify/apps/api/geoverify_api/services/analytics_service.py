"""Analytics aggregation service."""
from uuid import UUID
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from geoverify_api.models.test_run import TestRun
from geoverify_api.models.assertion_result import AssertionResult
from geoverify_api.models.daily_stats import DailyStats


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_trends(self, project_id: UUID, days: int = 7) -> dict:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.db.execute(
            select(DailyStats)
            .where(
                DailyStats.project_id == project_id,
                DailyStats.date >= since.date()
            )
            .order_by(DailyStats.date)
        )
        stats = result.scalars().all()
        return {
            "project_id": str(project_id),
            "days": days,
            "data": [
                {
                    "date": s.date.isoformat(),
                    "total": s.total_tests,
                    "passed": s.passed_tests,
                    "failed": s.failed_tests,
                    "avg_duration": round(s.avg_duration, 2),
                }
                for s in stats
            ],
        }

    async def get_coverage(self, project_id: UUID) -> dict:
        result = await self.db.execute(
            select(
                func.count(TestRun.id),
                func.sum(TestRun.total_count),
                func.sum(TestRun.passed_count)
            )
            .where(TestRun.project_id == project_id)
        )
        total_runs, total_assertions, passed_assertions = result.one()
        coverage = (passed_assertions / total_assertions * 100) if total_assertions else 0
        return {
            "project_id": str(project_id),
            "total_runs": total_runs or 0,
            "total_assertions": total_assertions or 0,
            "passed_assertions": passed_assertions or 0,
            "coverage_percent": round(coverage, 2),
        }

    async def get_assertion_breakdown(self, project_id: UUID, days: int = 30) -> dict:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.db.execute(
            select(
                AssertionResult.assertion_type,
                AssertionResult.status,
                func.count()
            )
            .join(TestRun)
            .where(
                TestRun.project_id == project_id,
                AssertionResult.created_at >= since
            )
            .group_by(AssertionResult.assertion_type, AssertionResult.status)
        )
        breakdown: dict = {}
        for assertion_type, status, count in result.all():
            if assertion_type not in breakdown:
                breakdown[assertion_type] = {}
            breakdown[assertion_type][status] = count
        return {
            "project_id": str(project_id),
            "days": days,
            "breakdown": breakdown,
        }
