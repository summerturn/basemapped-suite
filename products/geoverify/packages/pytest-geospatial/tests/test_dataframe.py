"""Tests for GeoDataFrame assertions and fixtures."""

import json

import pytest
import geopandas as gpd
from pyproj import CRS
from shapely.geometry import Point, Polygon

from pytest_geospatial.dataframe_assertions import (
    assert_geodataframe_valid,
    assert_geodataframe_crs,
    assert_no_overlaps,
    assert_bounds_within,
    assert_row_count,
    assert_column_exists,
    assert_geometry_type,
)


@pytest.fixture
def point_gdf() -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(
        {"name": ["a", "b", "c"]},
        geometry=[Point(0, 0), Point(1, 1), Point(2, 2)],
        crs="EPSG:4326",
    )


@pytest.fixture
def overlapping_gdf() -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(
        {"id": [1, 2]},
        geometry=[Point(0, 0).buffer(1), Point(0.5, 0).buffer(1)],
        crs="EPSG:4326",
    )


def test_assert_geodataframe_valid(point_gdf: gpd.GeoDataFrame) -> None:
    assert_geodataframe_valid(point_gdf)


def test_assert_geodataframe_crs(point_gdf: gpd.GeoDataFrame) -> None:
    assert_geodataframe_crs(point_gdf, "EPSG:4326")


def test_assert_geodataframe_crs_fail(point_gdf: gpd.GeoDataFrame) -> None:
    with pytest.raises(pytest.fail.Exception):
        assert_geodataframe_crs(point_gdf, "EPSG:3857")


def test_assert_no_overlaps(point_gdf: gpd.GeoDataFrame) -> None:
    assert_no_overlaps(point_gdf)


def test_assert_no_overlaps_fail(overlapping_gdf: gpd.GeoDataFrame) -> None:
    with pytest.raises(pytest.fail.Exception):
        assert_no_overlaps(overlapping_gdf)


def test_assert_bounds_within(point_gdf: gpd.GeoDataFrame) -> None:
    assert_bounds_within(point_gdf, -1, -1, 3, 3)


def test_assert_bounds_within_fail(point_gdf: gpd.GeoDataFrame) -> None:
    with pytest.raises(pytest.fail.Exception):
        assert_bounds_within(point_gdf, 10, 10, 20, 20)


def test_assert_row_count(point_gdf: gpd.GeoDataFrame) -> None:
    assert_row_count(point_gdf, min_rows=1, max_rows=5)


def test_assert_row_count_min_fail(point_gdf: gpd.GeoDataFrame) -> None:
    with pytest.raises(pytest.fail.Exception):
        assert_row_count(point_gdf, min_rows=10)


def test_assert_row_count_max_fail(point_gdf: gpd.GeoDataFrame) -> None:
    with pytest.raises(pytest.fail.Exception):
        assert_row_count(point_gdf, max_rows=1)


def test_assert_column_exists(point_gdf: gpd.GeoDataFrame) -> None:
    assert_column_exists(point_gdf, "name")


def test_assert_column_exists_fail(point_gdf: gpd.GeoDataFrame) -> None:
    with pytest.raises(pytest.fail.Exception):
        assert_column_exists(point_gdf, "missing")


def test_assert_geometry_type(point_gdf: gpd.GeoDataFrame) -> None:
    assert_geometry_type(point_gdf, "Point")


def test_assert_geometry_type_fail(point_gdf: gpd.GeoDataFrame) -> None:
    with pytest.raises(pytest.fail.Exception):
        assert_geometry_type(point_gdf, "Polygon")


def test_fixture_geo_tolerance(geo_tolerance: float) -> None:
    assert isinstance(geo_tolerance, float)
    assert geo_tolerance >= 0


def test_fixture_sample_point(sample_point: Point) -> None:
    assert isinstance(sample_point, Point)
    assert list(sample_point.coords) == [(0.0, 0.0)]


def test_fixture_sample_polygon(sample_polygon: Polygon) -> None:
    assert isinstance(sample_polygon, Polygon)
    assert sample_polygon.area == pytest.approx(1.0)


def test_fixture_sample_geodataframe(sample_geodataframe: gpd.GeoDataFrame) -> None:
    assert isinstance(sample_geodataframe, gpd.GeoDataFrame)
    assert len(sample_geodataframe) == 3
    assert sample_geodataframe.crs.to_epsg() == 4326


def test_fixture_epsg_4326(epsg_4326: CRS) -> None:
    assert isinstance(epsg_4326, CRS)
    assert epsg_4326.to_epsg() == 4326


def test_fixture_epsg_3857(epsg_3857: CRS) -> None:
    assert isinstance(epsg_3857, CRS)
    assert epsg_3857.to_epsg() == 3857


class FakeReport:
    def __init__(self, nodeid: str, outcome: str, duration: float = 0.0, keywords=None):
        self.nodeid = nodeid
        self.outcome = outcome
        self.duration = duration
        self.keywords = keywords or {}


def test_reporter_writes_json(tmp_path) -> None:
    from pytest_geospatial.reporters import GeoJSONReporter

    reporter = GeoJSONReporter(output_path=str(tmp_path / "report.json"))
    reporter.append(FakeReport("test_demo", "passed", 0.1, {"geo": 1}))
    reporter.write_json_report()
    data = json.loads((tmp_path / "report.json").read_text())
    assert data["summary"]["total"] == 1
    assert data["summary"]["passed"] == 1
    assert data["results"][0]["nodeid"] == "test_demo"


def test_cloud_client_upload(tmp_path, monkeypatch) -> None:
    import asyncio
    import httpx
    from pytest_geospatial.cloud_client import CloudClient

    report = tmp_path / "report.json"
    report.write_text('{"test": true}')
    client = CloudClient(base_url="http://example.com", api_token="secret")

    class FakeResponse:
        status_code = 201

        def raise_for_status(self):
            pass

        def json(self):
            return {"ok": True}

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def post(self, url, files, headers):
            return FakeResponse()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)
    result = asyncio.run(client.upload_report(str(report)))
    assert result == {"ok": True}


def test_cloud_client_file_not_found() -> None:
    import asyncio
    from pytest_geospatial.cloud_client import CloudClient

    client = CloudClient(base_url="http://example.com", api_token="secret")
    with pytest.raises(FileNotFoundError):
        asyncio.run(client.upload_report("nonexistent.json"))
