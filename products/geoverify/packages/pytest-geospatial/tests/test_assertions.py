"""Tests for core geometry assertions."""

import pytest
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


def test_geometry_valid():
    assert_geometry_valid(Polygon([(0, 0), (1, 0), (1, 1), (0, 1)]))


def test_geometry_equals():
    assert_geometry_equals(Point(0, 0), Point(0, 0))


def test_geometry_equals_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_geometry_equals(Point(0, 0), Point(1, 1))


def test_geometry_contains():
    assert_geometry_contains(Polygon([(0, 0), (2, 0), (2, 2), (0, 2)]), Point(1, 1))


def test_geometry_contains_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_geometry_contains(Point(0, 0), Point(1, 1))


def test_geometry_intersects():
    g1 = Point(0, 0).buffer(1)
    g2 = Point(0.5, 0).buffer(1)
    assert_geometry_intersects(g1, g2)


def test_geometry_intersects_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_geometry_intersects(Point(0, 0), Point(10, 10))


def test_within_distance():
    assert_within_distance(Point(0, 0), Point(3, 4), 5.1)


def test_within_distance_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_within_distance(Point(0, 0), Point(3, 4), 4.9)


def test_area_within():
    geom = Point(0, 0).buffer(1)
    assert_area_within(geom, min_area=2.0, max_area=5.0)


def test_area_within_min_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_area_within(Point(0, 0).buffer(10), min_area=1000)


def test_area_within_max_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_area_within(Point(0, 0).buffer(10), max_area=1)


def test_is_simple():
    assert_is_simple(LineString([(0, 0), (1, 1), (2, 0)]))


def test_is_simple_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_is_simple(LineString([(0, 0), (2, 2), (2, 0), (0, 2)]))


def test_is_ring():
    assert_is_ring(LineString([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)]))


def test_is_ring_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_is_ring(LineString([(0, 0), (1, 0), (1, 1), (0, 1)]))
