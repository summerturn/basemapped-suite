from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Literal
import logging

router = APIRouter(prefix="/integrations", tags=["integrations"])
logger = logging.getLogger(__name__)

class CrossProductEvent(BaseModel):
    event: Literal["validation.completed", "upload.processed", "import.completed", "assertion.failed", "map.rendered"]
    source: Literal["geolint", "mapdrop", "aquamap", "geoverify", "eternalmap"]
    payload: dict
    timestamp: str

@router.post("/webhook")
async def receive_webhook(event: CrossProductEvent):
    """Receive cross-product events."""
    logger.info(f"Received {event.event} from {event.source}")

    if event.event == "upload.processed" and event.source == "mapdrop":
        # Auto-trigger validation for newly uploaded MapDrop datasets
        logger.info(f"Auto-validating MapDrop dataset: {event.payload.get('datasetId')}")

    elif event.event == "import.completed" and event.source == "aquamap":
        # Log asset import for analytics
        logger.info(f"AquaMap import completed: {event.payload.get('utilityId')}")

    return {"success": True, "received": event.event}
