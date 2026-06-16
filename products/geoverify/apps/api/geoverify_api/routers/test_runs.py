from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from geoverify_api.database import get_db
from geoverify_api.models.test_run import TestRun
from geoverify_api.models.user import User
from geoverify_api.routers.auth import get_current_user
from geoverify_api.schemas.test_run import TestRunCreate, TestRunList, TestRunResponse

router = APIRouter(prefix="/test-runs", tags=["test-runs"])


@router.get("", response_model=TestRunList)
async def list_test_runs(
    project_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(TestRun)
    if project_id:
        query = query.where(TestRun.project_id == project_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.offset(skip).limit(limit).order_by(TestRun.created_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()

    return TestRunList(total=total, items=items)


@router.post("", response_model=TestRunResponse, status_code=status.HTTP_201_CREATED)
async def create_test_run(
    test_run: TestRunCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_run = TestRun(**test_run.model_dump())
    db.add(db_run)
    await db.commit()
    await db.refresh(db_run)
    return db_run


@router.get("/{run_id}", response_model=TestRunResponse)
async def get_test_run(
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TestRun).where(TestRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Test run not found")
    return run
