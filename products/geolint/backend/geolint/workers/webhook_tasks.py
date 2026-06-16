"""Webhook Celery tasks with retry and HMAC signature."""

import hmac
import hashlib
import json
import time

import requests
from celery import shared_task

from geolint.config.settings import settings


@shared_task(bind=True, max_retries=settings.WEBHOOK_MAX_RETRIES)
def send_webhook(self, webhook_url: str, payload: dict, secret: str | None = None):
    """Send a webhook payload with HMAC-SHA256 signature and exponential retry."""
    body = json.dumps(payload, separators=(",", ":"))
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "GeoLint-Webhook/1.0",
        "X-Geolint-Event": payload.get("event", "unknown"),
        "X-Geolint-Delivery": self.request.id or "sync",
    }

    if secret:
        signature = hmac.new(
            secret.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        headers["X-Geolint-Signature"] = f"sha256={signature}"

    try:
        response = requests.post(
            webhook_url,
            data=body,
            headers=headers,
            timeout=settings.WEBHOOK_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return {"status": "delivered", "http_status": response.status_code}
    except requests.exceptions.RequestException as exc:
        countdown = min(2 ** self.request.retries * 10, 3600)
        raise self.retry(exc=exc, countdown=countdown)
