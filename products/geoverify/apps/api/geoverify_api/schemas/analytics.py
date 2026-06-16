from datetime import date
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DailyStatsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    date: date
    total_runs: int
    passed_runs: int
    failed_runs: int
    total_assertions: int
    passed_assertions: int
    failed_assertions: int
    avg_duration_ms: Optional[int] = None
    coverage_pct: Optional[float] = None


class TrendData(BaseModel):
    date: str
    total_runs: int
    passed_runs: int
    failed_runs: int
    avg_duration_ms: Optional[int] = None


class TrendsResponse(BaseModel):
    project_id: UUID
    days: int
    data: List[TrendData]


class CoverageResponse(BaseModel):
    project_id: UUID
    coverage_pct: Optional[float] = None
    total_assertions: int
    passed_assertions: int


class AssertionBreakdown(BaseModel):
    status: str
    count: int


class AssertionBreakdownResponse(BaseModel):
    project_id: UUID
    breakdown: List[AssertionBreakdown]
