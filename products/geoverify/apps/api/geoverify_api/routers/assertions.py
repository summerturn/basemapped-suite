from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geoverify_api.database import get_db
from geoverify_api.models.assertion_result import AssertionResult
from geoverify_api.models.user import User
from geoverify_api.routers.auth import get_current_user
from geoverify_api.schemas.assertion import AssertionResultResponse

router = APIRouter(prefix="/assertions", tags=["assertions"])


@router.get("/run/{run_id}", response_model=List[AssertionResultResponse])
async def get_assertions_for_run(
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AssertionResult).where(AssertionResult.test_run_id == run_id)
    )
    assertions = result.scalars().all()
    return assertions
