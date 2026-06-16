from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AssertionResultBase(BaseModel):
    test_run_id: UUID
    test_name: str
    assertion_name: Optional[str] = None
    status: str
    message: Optional[str] = None
    expected: Optional[str] = None
    actual: Optional[str] = None
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict)
    duration_ms: Optional[int] = None
    file_path: Optional[str] = None
    line_number: Optional[int] = None


class AssertionResultCreate(AssertionResultBase):
    pass


class AssertionResultResponse(AssertionResultBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
