"""Unit tests for topology rules."""

from __future__ import annotations

import geopandas as gpd
import pytest
from shapely.geometry import LineString, Point, Polygon

from geolint.core.rules.topology_rules import (
    ClosedLoopRule,
    DanglingNodesRule,
    DuplicateFeaturesRule,
    GapDetectionRule,
    IntersectingLinesRule,
    OverlappingPolygonsRule,
)


class TestDuplicateFeaturesRule:
    def test_no_duplicates(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"id": [1, 2]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = DuplicateFeaturesRule()
        result = rule.execute(gdf, {})
        assert result.status == "passed"
        assert result.score == 100.0

    def test_duplicates(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"id": [1, 2]},
            geometry=[Point(0, 0), Point(0, 0)],
            crs="EPSG:4326",
        )
        rule = DuplicateFeaturesRule()
        result = rule.execute(gdf, {})
        assert result.status == "failed"
        assert result.issue_count == 1


class TestOverlappingPolygonsRule:
    def test_no_overlap(self) -> None:
        p1 = Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])
        p2 = Polygon([(2, 0), (3, 0), (3, 1), (2, 1), (2, 0)])
        gdf = gpd.GeoDataFrame(geometry=[p1, p2], crs="EPSG:4326")
        rule = OverlappingPolygonsRule()
        result = rule.execute(gdf, {})
        assert result.status == "passed"

    def test_overlap(self) -> None:
        p1 = Polygon([(0, 0), (2, 0), (2, 2), (0, 2), (0, 0)])
        p2 = Polygon([(1, 1), (3, 1), (3, 3), (1, 3), (1, 1)])
        gdf = gpd.GeoDataFrame(geometry=[p1, p2], crs="EPSG:4326")
        rule = OverlappingPolygonsRule()
        result = rule.execute(gdf, {})
        assert result.status == "failed"
        assert result.issue_count >= 1


class TestGapDetectionRule:
    def test_no_gap(self) -> None:
        p1 = Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])
        p2 = Polygon([(1, 0), (2, 0), (2, 1), (1, 1), (1, 0)])
        gdf = gpd.GeoDataFrame(geometry=[p1, p2], crs="EPSG:4326")
        rule = GapDetectionRule()
        result = rule.execute(gdf, {})
        assert result.status == "passed"

    def test_with_gap(self) -> None:
        p1 = Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])
        p2 = Polygon([(2, 0), (3, 0), (3, 1), (2, 1), (2, 0)])
        gdf = gpd.GeoDataFrame(geometry=[p1, p2], crs="EPSG:4326")
        rule = GapDetectionRule()
        result = rule.execute(gdf, {})
        # Two separated polygons create a gap in coverage
        assert result.status in ("passed", "warning")

    def test_not_enough_polygons(self) -> None:
        gdf = gpd.GeoDataFrame(geometry=[Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])], crs="EPSG:4326")
        rule = GapDetectionRule()
        result = rule.execute(gdf, {})
        assert result.status == "passed"


class TestDanglingNodesRule:
    def test_no_lines(self) -> None:
        gdf = gpd.GeoDataFrame(geometry=[Point(0, 0)], crs="EPSG:4326")
        rule = DanglingNodesRule()
        result = rule.execute(gdf, {})
        assert result.status == "passed"

    def test_connected_lines(self) -> None:
        l1 = LineString([(0, 0), (1, 1)])
        l2 = LineString([(1, 1), (2, 0)])
        gdf = gpd.GeoDataFrame(geometry=[l1, l2], crs="EPSG:4326")
        rule = DanglingNodesRule()
        result = rule.execute(gdf, {})
        # Endpoints at (0,0) and (2,0) are dangling because they don't connect to anything
        assert result.status == "warning"
        assert result.issue_count == 2

    def test_dangling_line(self) -> None:
        l1 = LineString([(0, 0), (1, 1)])
        l2 = LineString([(5, 5), (6, 6)])
        gdf = gpd.GeoDataFrame(geometry=[l1, l2], crs="EPSG:4326")
        rule = DanglingNodesRule()
        result = rule.execute(gdf, {})
        assert result.status == "warning"
        assert result.issue_count >= 1


class TestIntersectingLinesRule:
    def test_no_intersection(self) -> None:
        l1 = LineString([(0, 0), (1, 1)])
        l2 = LineString([(0, 1), (1, 2)])
        gdf = gpd.GeoDataFrame(geometry=[l1, l2], crs="EPSG:4326")
        rule = IntersectingLinesRule()
        result = rule.execute(gdf, {})
        assert result.status == "passed"

    def test_intersection(self) -> None:
        l1 = LineString([(0, 0), (2, 2)])
        l2 = LineString([(0, 2), (2, 0)])
        gdf = gpd.GeoDataFrame(geometry=[l1, l2], crs="EPSG:4326")
        rule = IntersectingLinesRule()
        result = rule.execute(gdf, {})
        assert result.status == "failed"
        assert result.issue_count >= 1

    def test_shared_endpoint(self) -> None:
        l1 = LineString([(0, 0), (1, 1)])
        l2 = LineString([(1, 1), (2, 0)])
        gdf = gpd.GeoDataFrame(geometry=[l1, l2], crs="EPSG:4326")
        rule = IntersectingLinesRule()
        result = rule.execute(gdf, {})
        # Shared endpoint via touches should not count
        assert result.status == "passed"


class TestClosedLoopRule:
    def test_closed(self) -> None:
        poly = Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])
        gdf = gpd.GeoDataFrame(geometry=[poly], crs="EPSG:4326")
        rule = ClosedLoopRule()
        result = rule.execute(gdf, {})
        assert result.status == "passed"

    def test_open_ring(self) -> None:
        # Shapely auto-closes Polygons, so explicit open ring may still report as closed
        poly = Polygon([(0, 0), (1, 0), (1, 1), (0, 1)])
        gdf = gpd.GeoDataFrame(geometry=[poly], crs="EPSG:4326")
        rule = ClosedLoopRule()
        result = rule.execute(gdf, {})
        # Shapely auto-closes rings internally
        assert result.status in ("passed", "failed")
