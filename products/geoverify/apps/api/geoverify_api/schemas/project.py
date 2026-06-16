from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectBase(BaseModel):
    name: str
    slug: str
    repo_url: Optional[str] = None
    repo_provider: Optional[str] = None
    repo_full_name: Optional[str] = None
    default_branch: Optional[str] = "main"
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ProjectCreate(ProjectBase):
    team_id: Optional[UUID] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    repo_url: Optional[str] = None
    repo_provider: Optional[str] = None
    repo_full_name: Optional[str] = None
    default_branch: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    team_id: Optional[UUID] = None
    created_at: datetime
