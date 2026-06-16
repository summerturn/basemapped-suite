"""Dataset service: upload, S3 storage, metadata extraction."""

import json
import os
import tempfile
import uuid as uuid_mod
from typing import Optional

import boto3
from botocore.config import Config
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geolint.config.settings import settings
from geolint.models import Dataset, Project


class DatasetService:
    """Service for dataset operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.s3 = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL or None,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
            region_name=settings.AWS_REGION,
            config=Config(signature_version="s3v4"),
        )

    async def upload_and_create(
        self,
        project_id: uuid_mod.UUID,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> Dataset:
        """Upload file to S3 and create Dataset record."""
        # Validate project exists
        result = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Validate size
        if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File too large")

        # Generate S3 key
        ext = os.path.splitext(filename)[1]
        dataset_id = uuid_mod.uuid4()
        s3_key = f"datasets/{project_id}/{dataset_id}{ext}"

        # Upload to S3
        try:
            self.s3.put_object(
                Bucket=settings.S3_BUCKET,
                Key=s3_key,
                Body=content,
                ContentType=content_type,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"S3 upload failed: {exc}")

        # Extract metadata (placeholder)
        metadata = self._extract_metadata(content, ext)

        dataset = Dataset(
            id=dataset_id,
            name=filename,
            project_id=project_id,
            s3_path=s3_key,
            format=ext.lstrip(".").lower() or "unknown",
            size_bytes=len(content),
            feature_count=metadata.get("feature_count", 0),
            detected_crs=metadata.get("crs"),
            bbox=metadata.get("bbox"),
            geometry_types=metadata.get("geometry_types"),
            status="ready",
        )
        self.db.add(dataset)
        await self.db.commit()
        await self.db.refresh(dataset)
        return dataset

    def _extract_metadata(self, content: bytes, ext: str) -> dict:
        """Extract basic metadata from file bytes."""
        # Placeholder: in production use fiona/gdal/geopandas
        metadata = {
            "feature_count": 0,
            "crs": None,
            "bbox": None,
            "geometry_types": None,
        }
        if ext.lower() == ".geojson":
            try:
                data = json.loads(content)
                features = data.get("features", [])
                metadata["feature_count"] = len(features)
                if features:
                    geom_types = set()
                    for f in features[:1000]:
                        gt = f.get("geometry", {}).get("type")
                        if gt:
                            geom_types.add(gt)
                    metadata["geometry_types"] = list(geom_types)
            except Exception:
                pass
        return metadata

    async def delete_dataset(self, dataset_id: uuid_mod.UUID) -> None:
        """Delete dataset record and S3 object."""
        result = await self.db.execute(
            select(Dataset).where(Dataset.id == dataset_id)
        )
        dataset = result.scalar_one_or_none()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        try:
            self.s3.delete_object(Bucket=settings.S3_BUCKET, Key=dataset.s3_path)
        except Exception:
            pass

        await self.db.delete(dataset)
        await self.db.commit()

    async def get_preview(self, dataset_id: uuid_mod.UUID) -> dict:
        """Return a preview of dataset features."""
        result = await self.db.execute(
            select(Dataset).where(Dataset.id == dataset_id)
        )
        dataset = result.scalar_one_or_none()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        # Fetch from S3
        try:
            obj = self.s3.get_object(Bucket=settings.S3_BUCKET, Key=dataset.s3_path)
            content = obj["Body"].read()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to fetch dataset: {exc}")

        features = []
        schema = {}
        if dataset.format == "geojson":
            try:
                data = json.loads(content)
                all_features = data.get("features", [])
                features = all_features[:50]
                if all_features:
                    props = all_features[0].get("properties", {})
                    schema = {k: type(v).__name__ for k, v in props.items()}
            except Exception:
                pass

        return {
            "features": features,
            "total_features": dataset.feature_count,
            "schema": schema,
        }
