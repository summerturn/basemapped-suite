"""Celery application configuration."""

from celery import Celery

from geolint.config.settings import settings

celery_app = Celery("geolint")
celery_app.conf.update(
    broker_url=settings.CELERY_BROKER_URL,
    result_backend=settings.CELERY_RESULT_BACKEND,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "geolint.workers.validation_tasks.*": {"queue": "validation"},
        "geolint.workers.webhook_tasks.*": {"queue": "webhooks"},
        "geolint.workers.cleanup_tasks.*": {"queue": "cleanup"},
    },
    task_default_queue="default",
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_default_retry_delay=60,
    task_max_retries=3,
    beat_schedule={
        "cleanup-temp-files": {
            "task": "geolint.workers.cleanup_tasks.cleanup_temp_files",
            "schedule": 3600.0,  # hourly
        },
        "archive-old-jobs": {
            "task": "geolint.workers.cleanup_tasks.archive_old_jobs",
            "schedule": 86400.0,  # daily
        },
        "cleanup-failed-uploads": {
            "task": "geolint.workers.cleanup_tasks.cleanup_failed_uploads",
            "schedule": 86400.0,  # daily
        },
    },
)

celery_app.autodiscover_tasks([
    "geolint.workers.validation_tasks",
    "geolint.workers.webhook_tasks",
    "geolint.workers.cleanup_tasks",
    "geolint.workers.events",
])
