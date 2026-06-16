"""WebSocket / SSE event publisher for live progress updates."""

import json
import asyncio
from typing import Dict, Set

from geolint.config.settings import settings


# In-memory SSE channel registry (for single-node; use Redis pub/sub for multi-node)
_subscribers: Dict[str, Set[asyncio.Queue]] = {}


async def subscribe(job_id: str) -> asyncio.Queue:
    """Subscribe to progress events for a job."""
    queue = asyncio.Queue()
    _subscribers.setdefault(job_id, set()).add(queue)
    return queue


async def unsubscribe(job_id: str, queue: asyncio.Queue):
    """Unsubscribe from progress events."""
    if job_id in _subscribers:
        _subscribers[job_id].discard(queue)
        if not _subscribers[job_id]:
            del _subscribers[job_id]


async def publish_progress(job_id: str, progress_pct: int, status: str, message: str | None = None):
    """Publish a progress event to all subscribers."""
    event = {
        "job_id": job_id,
        "progress_pct": progress_pct,
        "status": status,
        "message": message,
    }
    payload = json.dumps(event)

    queues = _subscribers.get(job_id, set()).copy()
    for queue in queues:
        try:
            await queue.put(payload)
        except Exception:
            pass
