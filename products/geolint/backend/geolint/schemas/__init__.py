"""Pydantic v2 schemas for GeoLint."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- User ----------
class UserBase(BaseModel):
    email: EmailStr
    name: str
    tier: str = "free"


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None


# ---------- Team ----------
class TeamBase(BaseModel):
    name: str
    plan: str = "free"


class TeamCreate(TeamBase):
    owner_id: UUID


class TeamResponse(TeamBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None


# ---------- TeamMember ----------
class TeamMemberBase(BaseModel):
    role: str = "viewer"


class TeamMemberCreate(TeamMemberBase):
    user_id: UUID
    team_id: UUID


class TeamMemberResponse(TeamMemberBase):
    model_config = ConfigDict(from_attributes=True)
    user_id: UUID
    team_id: UUID
    joined_at: datetime
    user: Optional[UserResponse] = None


# ---------- Project ----------
class ProjectBase(BaseModel):
    name: str
    rule_set_default: str = "standard"
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    team_id: UUID


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    rule_set_default: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    team_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None


# ---------- Dataset ----------
class DatasetBase(BaseModel):
    name: str
    format: str
    size_bytes: int = 0
    feature_count: int = 0
    detected_crs: Optional[str] = None
    bbox: Optional[List[float]] = None
    geometry_types: Optional[List[str]] = None
    status: str = "uploaded"


class DatasetCreate(DatasetBase):
    project_id: UUID
    s3_path: str


class DatasetResponse(DatasetBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    project_id: UUID
    s3_path: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class DatasetPreview(BaseModel):
    features: List[dict]
    total_features: int
    schema: dict


# ---------- ValidationJob ----------
class ValidationJobBase(BaseModel):
    rule_set: str = "standard"
    status: str = "pending"
    overall_score: Optional[float] = None
    grade: Optional[str] = None
    progress_pct: int = 0
    webhook_url: Optional[str] = None


class ValidationJobCreate(ValidationJobBase):
    dataset_id: UUID


class ValidationJobResponse(ValidationJobBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    dataset_id: UUID
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ---------- ValidationResult ----------
class ValidationResultBase(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    status: str
    score: float = 0.0
    issue_count: int = 0
    details: Optional[dict] = None


class ValidationResultResponse(ValidationResultBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    job_id: UUID
    created_at: datetime


# ---------- Issue ----------
class IssueBase(BaseModel):
    feature_id: Optional[str] = None
    feature_index: Optional[int] = None
    issue_type: str
    message: str
    severity: str = "medium"
    coordinates: Optional[List[float]] = None
    suggested_fix: Optional[str] = None


class IssueResponse(IssueBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    result_id: UUID
    created_at: datetime


# ---------- Webhook ----------
class WebhookBase(BaseModel):
    url: str
    events: List[str] = Field(default_factory=list)
    secret: Optional[str] = None
    active: bool = True


class WebhookCreate(WebhookBase):
    team_id: UUID


class WebhookUpdate(BaseModel):
    url: Optional[str] = None
    events: Optional[List[str]] = None
    secret: Optional[str] = None
    active: Optional[bool] = None


class WebhookResponse(WebhookBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    team_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None


# ---------- Rule ----------
class RuleInfo(BaseModel):
    id: str
    name: str
    description: str
    category: str
    default_enabled: bool = True


class RuleSetInfo(BaseModel):
    id: str
    name: str
    description: str
    rules: List[str]


# ---------- Report ----------
class ReportSummary(BaseModel):
    job_id: UUID
    overall_score: float
    grade: str
    total_issues: int
    issues_by_severity: dict
    issues_by_category: dict
    results: List[ValidationResultResponse]


class ValidationProgressEvent(BaseModel):
    job_id: UUID
    progress_pct: int
    status: str
    message: Optional[str] = None


# ---------- Auth ----------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


__all__ = [
    "UserBase",
    "UserCreate",
    "UserResponse",
    "TeamBase",
    "TeamCreate",
    "TeamResponse",
    "TeamMemberBase",
    "TeamMemberCreate",
    "TeamMemberResponse",
    "ProjectBase",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    "DatasetBase",
    "DatasetCreate",
    "DatasetResponse",
    "DatasetPreview",
    "ValidationJobBase",
    "ValidationJobCreate",
    "ValidationJobResponse",
    "ValidationResultBase",
    "ValidationResultResponse",
    "IssueBase",
    "IssueResponse",
    "WebhookBase",
    "WebhookCreate",
    "WebhookUpdate",
    "WebhookResponse",
    "RuleInfo",
    "RuleSetInfo",
    "ReportSummary",
    "ValidationProgressEvent",
    "TokenResponse",
    "LoginRequest",
]
