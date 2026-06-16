"""Main ingestion loader for GeoLint."""

from __future__ import annotations

import hashlib
import mimetypes
import os
import tempfile
import warnings
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import fiona
import geopandas as gpd
import pandas as pd
import shapely

from geolint.core.ingest.crs_detector import CRSReprojector, detect_crs
from geolint.core.ingest.exceptions import (
    CorruptFileError,
    EmptyDatasetError,
    MissingCRSWarning,
    UnsupportedFormatError,
)


@dataclass
class IngestionResult:
    format_type: str
    geodataframe: gpd.GeoDataFrame
    detected_crs: str
    bbox: tuple[float, float, float, float]
    feature_count: int
    geometry_types: list[str]
    attribute_schema: dict[str, str]
    layer_name: Optional[str] = None
    file_size_bytes: int = 0
    checksum_sha256: str = ""


class ShapefileExtractor:
    """Helper to extract Shapefile archives to temporary directories."""

    @staticmethod
    def extract(zip_path: str | Path, dest_dir: Optional[str | Path] = None) -> Path:
        """Extract a .zip containing a Shapefile and return path to the .shp file."""
        zip_path = Path(zip_path)
        if dest_dir is None:
            dest_dir = tempfile.mkdtemp(prefix="geolint_shp_")
        dest = Path(dest_dir)
        try:
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(dest)
        except zipfile.BadZipFile as exc:
            raise CorruptFileError(f"Invalid zip file: {zip_path}") from exc

        shp_files = list(dest.rglob("*.shp"))
        if not shp_files:
            raise CorruptFileError(f"No .shp file found inside archive: {zip_path}")
        return shp_files[0]


def auto_detect_format(file_path: str | Path) -> str:
    """Auto-detect geospatial format from file extension and magic bytes."""
    path = Path(file_path)
    ext = path.suffix.lower()
    name = path.name.lower()

    if ext == ".geojson" or ext == ".json":
        return "geojson"
    if ext == ".shp":
        return "shapefile"
    if ext == ".zip":
        return "shapefile_zip"
    if ext == ".gpkg":
        return "geopackage"
    if ext == ".parquet":
        return "geoparquet"
    if ext == ".csv":
        return "csv"

    mime, _ = mimetypes.guess_type(str(path))
    if mime == "application/geo+json":
        return "geojson"
    if mime == "application/x-sqlite3" and name.endswith(".gpkg"):
        return "geopackage"

    with open(path, "rb") as f:
        header = f.read(8)
    if header.startswith(b"PK"):
        return "shapefile_zip"
    if header.startswith(b"{"):
        return "geojson"
    if header.startswith(b"GP"):
        return "geopackage"

    raise UnsupportedFormatError(f"Could not detect format for: {file_path}")


def _compute_sha256(file_path: str | Path) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _build_attribute_schema(gdf: gpd.GeoDataFrame) -> dict[str, str]:
    return {col: str(dtype) for col, dtype in gdf.dtypes.items() if col != gdf.geometry.name}


def _extract_geometry_types(gdf: gpd.GeoDataFrame) -> list[str]:
    types = gdf.geometry.geom_type.unique().tolist()
    return [str(t) for t in types if t is not None]


def _build_bbox(gdf: gpd.GeoDataFrame) -> tuple[float, float, float, float]:
    if gdf.empty:
        return (0.0, 0.0, 0.0, 0.0)
    bounds = gdf.total_bounds
    return (float(bounds[0]), float(bounds[1]), float(bounds[2]), float(bounds[3]))


def load_file(
    file_path: str | Path,
    user_crs_hint: Optional[str | int] = None,
    layer: Optional[str] = None,
    target_crs: Optional[str | int] = None,
    csv_lon: Optional[str] = None,
    csv_lat: Optional[str] = None,
) -> IngestionResult:
    """Load a geospatial file and return a standardized IngestionResult."""
    path = Path(file_path)
    if not path.exists():
        raise CorruptFileError(f"File not found: {path}")

    file_size = path.stat().st_size
    checksum = _compute_sha256(path)
    fmt = auto_detect_format(path)

    gdf: gpd.GeoDataFrame
    actual_layer: Optional[str] = layer

    try:
        if fmt == "geojson":
            gdf = gpd.read_file(path)
        elif fmt == "shapefile_zip":
            shp_path = ShapefileExtractor.extract(path)
            gdf = gpd.read_file(shp_path)
            actual_layer = shp_path.stem
            fmt = "shapefile"
        elif fmt == "shapefile":
            gdf = gpd.read_file(path)
        elif fmt == "geopackage":
            gdf = gpd.read_file(path, layer=layer)
            if layer:
                actual_layer = layer
            else:
                actual_layer = gpd.list_layers(path).name.iloc[0]
        elif fmt == "geoparquet":
            gdf = gpd.read_parquet(path)
        elif fmt == "csv":
            df = pd.read_csv(path)
            lon_col = csv_lon or next(
                (c for c in df.columns if c.lower() in ("lon", "longitude", "x")), None
            )
            lat_col = csv_lat or next(
                (c for c in df.columns if c.lower() in ("lat", "latitude", "y")), None
            )
            if lon_col is None or lat_col is None:
                raise CorruptFileError(
                    f"CSV missing recognizable lat/lon columns: {df.columns.tolist()}"
                )
            gdf = gpd.GeoDataFrame(
                df,
                geometry=gpd.points_from_xy(df[lon_col], df[lat_col]),
                crs="EPSG:4326",
            )
        else:
            raise UnsupportedFormatError(f"Unsupported format detected: {fmt}")
    except (pd.errors.EmptyDataError, ValueError, fiona.errors.DriverError) as exc:
        raise CorruptFileError(f"Failed to read file: {exc}") from exc

    if gdf.empty:
        raise EmptyDatasetError("Dataset contains no features.")

    detected_crs = detect_crs(gdf, user_hint=user_crs_hint)
    if gdf.crs is None:
        gdf = gdf.set_crs(detected_crs)

    if target_crs is not None:
        reprojector = CRSReprojector(target_crs)
        gdf = reprojector.reproject(gdf)

    bbox = _build_bbox(gdf)
    feature_count = len(gdf)
    geometry_types = _extract_geometry_types(gdf)
    attribute_schema = _build_attribute_schema(gdf)

    return IngestionResult(
        format_type=fmt,
        geodataframe=gdf,
        detected_crs=gdf.crs.to_string() if gdf.crs else detected_crs,
        bbox=bbox,
        feature_count=feature_count,
        geometry_types=geometry_types,
        attribute_schema=attribute_schema,
        layer_name=actual_layer,
        file_size_bytes=file_size,
        checksum_sha256=checksum,
    )
