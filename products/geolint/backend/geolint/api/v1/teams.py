"""Team API routes."""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geolint.database import get_db
from geolint.models import Team, TeamMember, User
from geolint.schemas import TeamResponse, TeamMemberResponse, TeamMemberCreate, UserResponse

router = APIRouter()


@router.get("/teams/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a team by ID."""
    result = await db.execute(select(Team).where(Team.id == uuid.UUID(team_id)))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.put("/teams/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Update team details."""
    result = await db.execute(select(Team).where(Team.id == uuid.UUID(team_id)))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if "name" in payload:
        team.name = payload["name"]
    if "plan" in payload:
        team.plan = payload["plan"]

    await db.commit()
    await db.refresh(team)
    return team


@router.get("/teams/{team_id}/members", response_model=List[TeamMemberResponse])
async def list_team_members(
    team_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List members of a team."""
    result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == uuid.UUID(team_id))
    )
    members = result.scalars().all()
    return members


@router.post("/teams/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: str,
    payload: TeamMemberCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a member to a team."""
    member = TeamMember(
        user_id=payload.user_id,
        team_id=uuid.UUID(team_id),
        role=payload.role,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


@router.put("/teams/{team_id}/members/{user_id}", response_model=TeamMemberResponse)
async def update_team_member(
    team_id: str,
    user_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Update a team member's role."""
    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.team_id == uuid.UUID(team_id))
        .where(TeamMember.user_id == uuid.UUID(user_id))
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    if "role" in payload:
        member.role = payload["role"]

    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/teams/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from a team."""
    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.team_id == uuid.UUID(team_id))
        .where(TeamMember.user_id == uuid.UUID(user_id))
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    await db.delete(member)
    await db.commit()
    return None
