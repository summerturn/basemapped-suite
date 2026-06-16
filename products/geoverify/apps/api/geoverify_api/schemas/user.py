"""User schemas."""
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    github_id: str
    email: str | None = None
    username: str
    avatar_url: str | None = None


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
