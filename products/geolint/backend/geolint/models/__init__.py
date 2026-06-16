"""SQLAlchemy models for GeoLint."""

import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    Boolean,
    Text,
    JSON,
    Enum,
    BigInteger,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from geolint.database import Base


class UserTier(str, PyEnum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class TeamRole(str, PyEnum):
    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class JobStatus(str, PyEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Severity(str, PyEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    tier = Column(Enum(UserTier), default=UserTier.FREE, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    teams = relationship("TeamMember", back_populates="user", cascade="all, delete-orphan")
    owned_teams = relationship("Team", back_populates="owner", foreign_keys="Team.owner_id")


class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    plan = Column(String(50), default="free")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="owned_teams", foreign_keys=[owner_id])
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="team", cascade="all, delete-orphan")
    webhooks = relationship("Webhook", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), primary_key=True)
    role = Column(Enum(TeamRole), default=TeamRole.VIEWER, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="teams")
    team = relationship("Team", back_populates="members")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    rule_set_default = Column(String(100), default="standard")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship("Team", back_populates="projects")
    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    s3_path = Column(String(512), nullable=False)
    format = Column(String(50), nullable=False)
    size_bytes = Column(BigInteger, default=0)
    feature_count = Column(Integer, default=0)
    detected_crs = Column(String(50), nullable=True)
    bbox = Column(ARRAY(Float), nullable=True)  # [minx, miny, maxx, maxy]
    geometry_types = Column(ARRAY(String), nullable=True)
    status = Column(String(50), default="uploaded")  # uploaded, processing, ready, error
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="datasets")
    validation_jobs = relationship("ValidationJob", back_populates="dataset", cascade="all, delete-orphan")


class ValidationJob(Base):
    __tablename__ = "validation_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False)
    rule_set = Column(String(100), default="standard")
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    overall_score = Column(Float, nullable=True)
    grade = Column(String(5), nullable=True)
    progress_pct = Column(Integer, default=0)
    webhook_url = Column(String(512), nullable=True)
    error_message = Column(Text, nullable=True)
    traceback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    dataset = relationship("Dataset", back_populates="validation_jobs")
    results = relationship("ValidationResult", back_populates="job", cascade="all, delete-orphan")


class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("validation_jobs.id"), nullable=False)
    rule_id = Column(String(100), nullable=False)
    rule_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)  # pass, fail, warning, skipped
    score = Column(Float, default=0.0)
    issue_count = Column(Integer, default=0)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("ValidationJob", back_populates="results")
    issues = relationship("Issue", back_populates="result", cascade="all, delete-orphan")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    result_id = Column(UUID(as_uuid=True), ForeignKey("validation_results.id"), nullable=False)
    feature_id = Column(String(255), nullable=True)
    feature_index = Column(Integer, nullable=True)
    issue_type = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(Enum(Severity), default=Severity.MEDIUM, nullable=False)
    coordinates = Column(ARRAY(Float), nullable=True)  # [lon, lat] or flattened bbox
    suggested_fix = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    result = relationship("ValidationResult", back_populates="issues")


class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    url = Column(String(512), nullable=False)
    events = Column(ARRAY(String), default=list, nullable=False)
    secret = Column(String(255), nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship("Team", back_populates="webhooks")


__all__ = [
    "User",
    "Team",
    "TeamMember",
    "Project",
    "Dataset",
    "ValidationJob",
    "ValidationResult",
    "Issue",
    "Webhook",
    "UserTier",
    "TeamRole",
    "JobStatus",
    "Severity",
]
