"""Quick smoke test to verify pytest-geospatial loads and basic assertions pass."""

import shapely
from shapely.geometry import Point, LineString, Polygon

from pytest_geospatial.assertions import (
    assert_geometry_valid,
    assert_geometry_equals,
    assert_geometry_contains,
    assert_geometry_intersects,
    assert_within_distance,
    assert_area_within,
    assert_is_simple,
    assert_is_ring,
)
from pytest_geospatial.validators import (
    assert_crs_equal,
    assert_crs_is_geographic,
    assert_crs_is_projected,
)


def test_assert_geometry_valid():
    geom = Polygon([(0, 0), (1, 0), (1, 1), (0, 1)])
    assert_geometry_valid(geom)


def test_assert_geometry_equals():
    p1 = Point(0, 0)
    p2 = Point(0, 0)
    assert_geometry_equals(p1, p2)


def test_assert_geometry_contains():
    container = Polygon([(0, 0), (2, 0), (2, 2), (0, 2)])
    contained = Point(1, 1)
    assert_geometry_contains(container, contained)


def test_assert_geometry_intersects():
    g1 = Point(0, 0).buffer(1)
    g2 = Point(0.5, 0).buffer(1)
    assert_geometry_intersects(g1, g2)


def test_assert_within_distance():
    g1 = Point(0, 0)
    g2 = Point(0, 3)
    assert_within_distance(g1, g2, 5)


def test_assert_area_within():
    geom = Point(0, 0).buffer(1)
    assert_area_within(geom, min_area=2.0, max_area=5.0)


def test_assert_is_simple():
    ls = LineString([(0, 0), (1, 1), (2, 0)])
    assert_is_simple(ls)


def test_assert_is_ring():
    ls = LineString([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])
    assert_is_ring(ls)


def test_assert_crs_equal():
    assert_crs_equal("EPSG:4326", "EPSG:4326")


def test_assert_crs_is_geographic():
    assert_crs_is_geographic("EPSG:4326")


def test_assert_crs_is_projected():
    assert_crs_is_projected("EPSG:3857")
