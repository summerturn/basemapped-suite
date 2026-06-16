import hmac
import hashlib
import json
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geoverify_api.config import settings
from geoverify_api.database import get_db
from geoverify_api.models.project import Project
from geoverify_api.models.test_run import TestRun

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/github")
async def github_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    payload = await request.body()

    webhook_secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", None) or settings.SECRET_KEY
    if x_hub_signature_256 and webhook_secret:
        if not verify_github_signature(payload, x_hub_signature_256, webhook_secret):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature",
            )

    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = request.headers.get("X-GitHub-Event", "push")

    repo_full_name = data.get("repository", {}).get("full_name")
    if repo_full_name:
        result = await db.execute(
            select(Project).where(Project.repo_full_name == repo_full_name)
        )
        project = result.scalar_one_or_none()

        if project and event_type == "push":
            commit_sha = data.get("after")
            branch = data.get("ref", "").replace("refs/heads/", "")

            test_run = TestRun(
                project_id=project.id,
                commit_sha=commit_sha,
                branch=branch,
                status="pending",
                metadata={"github_event": event_type},
            )
            db.add(test_run)
            await db.commit()
            return {
                "status": "processed",
                "test_run_id": str(test_run.id),
                "event": event_type,
            }

    return {"status": "received", "event": event_type}
