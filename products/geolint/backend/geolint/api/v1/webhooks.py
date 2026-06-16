"""Webhook API routes."""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geolint.database import get_db
from geolint.models import Webhook
from geolint.schemas import WebhookCreate, WebhookUpdate, WebhookResponse
from geolint.workers.webhook_tasks import send_webhook

router = APIRouter()


@router.post("/webhooks", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    payload: WebhookCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new webhook."""
    webhook = Webhook(**payload.model_dump())
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)
    return webhook


@router.get("/webhooks", response_model=List[WebhookResponse])
async def list_webhooks(
    team_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List webhooks for a team."""
    result = await db.execute(
        select(Webhook)
        .where(Webhook.team_id == uuid.UUID(team_id))
        .order_by(Webhook.created_at.desc())
    )
    return result.scalars().all()


@router.get("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a webhook by ID."""
    result = await db.execute(select(Webhook).where(Webhook.id == uuid.UUID(webhook_id)))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return webhook


@router.put("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: str,
    payload: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a webhook."""
    result = await db.execute(select(Webhook).where(Webhook.id == uuid.UUID(webhook_id)))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(webhook, field, value)

    await db.commit()
    await db.refresh(webhook)
    return webhook


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a webhook."""
    result = await db.execute(select(Webhook).where(Webhook.id == uuid.UUID(webhook_id)))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    await db.delete(webhook)
    await db.commit()
    return None


@router.post("/webhooks/{webhook_id}/test", status_code=status.HTTP_202_ACCEPTED)
async def test_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Send a test payload to the webhook."""
    result = await db.execute(select(Webhook).where(Webhook.id == uuid.UUID(webhook_id)))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    send_webhook.delay(
        webhook_url=webhook.url,
        payload={"event": "webhook.test", "message": "This is a test event"},
        secret=webhook.secret,
    )
    return {"status": "queued", "detail": "Test webhook sent"}
