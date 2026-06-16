"""Unit tests for GeoLint ingestion module."""

from __future__ import annotations

import json
import os
import tempfile
import warnings
import zipfile
from pathlib import Path

import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Point

from geolint.core.ingest.crs_detector import CRSReprojector, detect_crs
from geolint.core.ingest.exceptions import (
    CorruptFileError,
    EmptyDatasetError,
    MissingCRSWarning,
    UnsupportedFormatError,
)
from geolint.core.ingest.loader import (
    IngestionResult,
    ShapefileExtractor,
    auto_detect_format,
    load_file,
)


class TestAutoDetectFormat:
    def test_geojson_by_extension(self, tmp_path: Path) -> None:
        path = tmp_path / "test.geojson"
        path.write_text('{"type": "FeatureCollection", "features": []}')
        assert auto_detect_format(path) == "geojson"

    def test_shapefile_by_extension(self, tmp_path: Path) -> None:
        path = tmp_path / "test.shp"
        path.write_bytes(b"\x00\x00\x27\x0a")
        assert auto_detect_format(path) == "shapefile"

    def test_zip_by_extension(self, tmp_path: Path) -> None:
        path = tmp_path / "test.zip"
        with zipfile.ZipFile(path, "w") as zf:
            zf.writestr("test.shp", "")
        assert auto_detect_format(path) == "shapefile_zip"

    def test_geopackage_by_extension(self, tmp_path: Path) -> None:
        path = tmp_path / "test.gpkg"
        path.write_bytes(b"GP")
        assert auto_detect_format(path) == "geopackage"

    def test_csv_by_extension(self, tmp_path: Path) -> None:
        path = tmp_path / "test.csv"
        path.write_text("lat,lon\n0,0")
        assert auto_detect_format(path) == "csv"

    def test_unsupported_format(self, tmp_path: Path) -> None:
        path = tmp_path / "test.xyz"
        path.write_text("abc")
        with pytest.raises(UnsupportedFormatError):
            auto_detect_format(path)


class TestShapefileExtractor:
    def test_extract_shapefile(self, tmp_path: Path) -> None:
        zip_path = tmp_path / "archive.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("layer.shp", "dummy")
            zf.writestr("layer.dbf", "dummy")
        out = ShapefileExtractor.extract(zip_path)
        assert out.name == "layer.shp"

    def test_missing_shp(self, tmp_path: Path) -> None:
        zip_path = tmp_path / "bad.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("readme.txt", "no shapefile")
        with pytest.raises(CorruptFileError):
            ShapefileExtractor.extract(zip_path)

    def test_bad_zip(self, tmp_path: Path) -> None:
        zip_path = tmp_path / "bad.zip"
        zip_path.write_text("not a zip")
        with pytest.raises(CorruptFileError):
            ShapefileExtractor.extract(zip_path)


class TestLoadFile:
    def test_load_geojson(self, tmp_path: Path) -> None:
        path = tmp_path / "points.geojson"
        gdf = gpd.GeoDataFrame(
            {"name": ["A", "B"]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        gdf.to_file(path, driver="GeoJSON")
        result = load_file(path)
        assert isinstance(result, IngestionResult)
        assert result.format_type == "geojson"
        assert result.feature_count == 2
        assert result.detected_crs == "EPSG:4326"

    def test_load_csv(self, tmp_path: Path) -> None:
        path = tmp_path / "points.csv"
        df = pd.DataFrame({"latitude": [0.0, 1.0], "longitude": [10.0, 11.0], "name": ["A", "B"]})
        df.to_csv(path, index=False)
        result = load_file(path)
        assert result.format_type == "csv"
        assert result.feature_count == 2
        assert "Point" in result.geometry_types

    def test_load_csv_missing_columns(self, tmp_path: Path) -> None:
        path = tmp_path / "bad.csv"
        pd.DataFrame({"x": [1]}).to_csv(path, index=False)
        with pytest.raises(CorruptFileError):
            load_file(path)

    def test_file_not_found(self, tmp_path: Path) -> None:
        with pytest.raises(CorruptFileError):
            load_file(tmp_path / "nonexistent.geojson")

    def test_empty_dataset(self, tmp_path: Path) -> None:
        path = tmp_path / "empty.geojson"
        gdf = gpd.GeoDataFrame(
            {"name": []},
            geometry=gpd.GeoSeries([], dtype=gpd.array.GeometryDtype()),
            crs="EPSG:4326",
        )
        gdf.to_file(path, driver="GeoJSON")
        with pytest.raises(EmptyDatasetError):
            load_file(path)

    def test_reprojection(self, tmp_path: Path) -> None:
        path = tmp_path / "points.geojson"
        gdf = gpd.GeoDataFrame(
            {"name": ["A"]},
            geometry=[Point(0, 0)],
            crs="EPSG:4326",
        )
        gdf.to_file(path, driver="GeoJSON")
        result = load_file(path, target_crs="EPSG:3857")
        assert result.detected_crs == "EPSG:3857"

    def test_user_crs_hint(self, tmp_path: Path) -> None:
        path = tmp_path / "no_crs.csv"
        pd.DataFrame({"lat": [0], "lon": [0]}).to_csv(path, index=False)
        result = load_file(path, user_crs_hint="EPSG:4326")
        assert result.detected_crs == "EPSG:4326"


class TestCRSDetector:
    def test_detect_crs_from_gdf(self) -> None:
        gdf = gpd.GeoDataFrame(geometry=[Point(0, 0)], crs="EPSG:32633")
        assert detect_crs(gdf) == "EPSG:32633"

    def test_detect_crs_user_hint(self) -> None:
        gdf = gpd.GeoDataFrame(geometry=[Point(0, 0)])
        assert detect_crs(gdf, user_hint=32633) == "EPSG:32633"

    def test_detect_crs_fallback_warning(self) -> None:
        gdf = gpd.GeoDataFrame(geometry=[Point(0, 0)])
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            crs = detect_crs(gdf)
            assert crs == "EPSG:4326"
            assert any(issubclass(warning.category, MissingCRSWarning) for warning in w)

    def test_reprojector(self) -> None:
        gdf = gpd.GeoDataFrame(geometry=[Point(0, 0)], crs="EPSG:4326")
        reproj = CRSReprojector("EPSG:3857")
        result = reproj.reproject(gdf)
        assert result.crs.to_string() == "EPSG:3857"

    def test_reprojector_no_crs_warning(self) -> None:
        gdf = gpd.GeoDataFrame(geometry=[Point(0, 0)])
        reproj = CRSReprojector("EPSG:4326")
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            result = reproj.reproject(gdf)
            assert result.crs.to_string() == "EPSG:4326"
            assert any(issubclass(warning.category, MissingCRSWarning) for warning in w)
