from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TestRunBase(BaseModel):
    project_id: UUID
    commit_sha: Optional[str] = None
    branch: Optional[str] = None
    status: str = "pending"
    total_count: int = 0
    passed_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0
    duration_ms: Optional[int] = None
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict)


class TestRunCreate(TestRunBase):
    pass


class TestRunResponse(TestRunBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime


class TestRunList(BaseModel):
    total: int
    items: list[TestRunResponse]
