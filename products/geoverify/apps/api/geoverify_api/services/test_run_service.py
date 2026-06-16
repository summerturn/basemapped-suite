"""Test run business logic."""
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from geoverify_api.models.test_run import TestRun
from geoverify_api.models.daily_stats import DailyStats


class TestRunService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, project_id: UUID, commit_sha: str | None = None,
                     branch: str | None = None, **kwargs) -> TestRun:
        run = TestRun(project_id=project_id, commit_sha=commit_sha, branch=branch, **kwargs)
        self.db.add(run)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def get(self, run_id: UUID) -> TestRun | None:
        result = await self.db.execute(select(TestRun).where(TestRun.id == run_id))
        return result.scalar_one_or_none()

    async def list_by_project(self, project_id: UUID, limit: int = 50) -> list[TestRun]:
        result = await self.db.execute(
            select(TestRun)
            .where(TestRun.project_id == project_id)
            .order_by(TestRun.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def finish(self, run_id: UUID, status: str, total: int, passed: int,
                     failed: int, skipped: int = 0, duration: float = 0.0) -> TestRun | None:
        run = await self.get(run_id)
        if not run:
            return None
        run.status = status
        run.total_count = total
        run.passed_count = passed
        run.failed_count = failed
        run.skipped_count = skipped
        run.duration_seconds = duration
        run.finished_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(run)
        await self._update_daily_stats(run.project_id)
        return run

    async def _update_daily_stats(self, project_id: UUID) -> None:
        today = datetime.now(timezone.utc).date()
        result = await self.db.execute(
            select(DailyStats).where(
                DailyStats.project_id == project_id,
                DailyStats.date == today
            )
        )
        stats = result.scalar_one_or_none()

        run_stats = await self.db.execute(
            select(
                func.count(TestRun.id),
                func.sum(TestRun.passed_count),
                func.sum(TestRun.failed_count),
                func.avg(TestRun.duration_seconds)
            )
            .where(
                TestRun.project_id == project_id,
                func.date(TestRun.created_at) == today
            )
        )
        total, passed, failed, avg_duration = run_stats.one()

        if stats:
            stats.total_tests = total or 0
            stats.passed_tests = passed or 0
            stats.failed_tests = failed or 0
            stats.avg_duration = float(avg_duration or 0)
        else:
            stats = DailyStats(
                project_id=project_id,
                date=today,
                total_tests=total or 0,
                passed_tests=passed or 0,
                failed_tests=failed or 0,
                avg_duration=float(avg_duration or 0)
            )
            self.db.add(stats)

        await self.db.commit()
