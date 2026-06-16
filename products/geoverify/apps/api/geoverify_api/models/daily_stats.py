import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from geoverify_api.database import Base


class DailyStats(Base):
    __tablename__ = "daily_stats"
    __table_args__ = (
        UniqueConstraint("project_id", "date", name="uix_daily_stats_project_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    total_runs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    passed_runs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_runs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_assertions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    passed_assertions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_assertions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    coverage_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
