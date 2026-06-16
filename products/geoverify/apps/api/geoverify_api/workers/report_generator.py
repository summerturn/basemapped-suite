"""Celery background tasks for report generation."""
from celery import Celery

from geoverify_api.config import settings

app = Celery("geoverify", broker=settings.REDIS_URL, backend=settings.REDIS_URL)


@app.task
def generate_report(test_run_id: str) -> dict:
    """Generate a detailed report for a test run."""
    return {"test_run_id": test_run_id, "status": "generated", "url": f"/reports/{test_run_id}.json"}


@app.task
def aggregate_daily_stats(project_id: str) -> dict:
    """Aggregate daily statistics for a project."""
    return {"project_id": project_id, "status": "aggregated"}


@app.task
def send_notification(project_id: str, event: str) -> dict:
    """Send notification for project events."""
    return {"project_id": project_id, "event": event, "status": "sent"}
