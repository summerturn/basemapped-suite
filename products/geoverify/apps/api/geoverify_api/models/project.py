import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from geoverify_api.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    team_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    repo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    repo_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    repo_full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    default_branch: Mapped[Optional[str]] = mapped_column(String(255), default="main")
    settings: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
