"""CRS detection and reprojection utilities."""

from __future__ import annotations

import warnings
from typing import Optional

import geopandas as gpd
import pyproj

from geolint.core.ingest.exceptions import MissingCRSWarning


class CRSReprojector:
    """Reproject GeoDataFrames to a target coordinate reference system."""

    def __init__(self, target_crs: str | int = "EPSG:4326") -> None:
        self.target_crs = target_crs

    def reproject(self, gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
        """Reproject a GeoDataFrame to the target CRS."""
        if gdf.crs is None:
            warnings.warn(
                "GeoDataFrame has no CRS; assigning fallback EPSG:4326 before reprojection.",
                MissingCRSWarning,
                stacklevel=2,
            )
            gdf = gdf.set_crs("EPSG:4326")
        if gdf.crs.to_string() == self._canonical(self.target_crs):
            return gdf
        return gdf.to_crs(self.target_crs)

    @staticmethod
    def _canonical(crs: str | int) -> str:
        """Return canonical string representation of a CRS."""
        return pyproj.CRS.from_user_input(crs).to_string()


def detect_crs(gdf: gpd.GeoDataFrame, user_hint: Optional[str | int] = None) -> str:
    """Detect CRS from file metadata, user hint, or fallback to EPSG:4326."""
    if gdf.crs is not None:
        return gdf.crs.to_string()
    if user_hint is not None:
        return CRSReprojector._canonical(user_hint)
    warnings.warn(
        "No CRS found in file metadata and no user hint provided; falling back to EPSG:4326.",
        MissingCRSWarning,
        stacklevel=2,
    )
    return "EPSG:4326"
