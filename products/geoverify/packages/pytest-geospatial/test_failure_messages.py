"""Verify that failures produce descriptive messages."""
import pytest
from shapely.geometry import Point, LineString, Polygon
from pytest_geospatial.assertions import (
    assert_geometry_equals,
    assert_geometry_contains,
    assert_within_distance,
)
from pytest_geospatial.validators import assert_crs_is_geographic

def test_equals_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_geometry_equals(Point(0, 0), Point(1, 1))

def test_contains_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_geometry_contains(Point(0, 0), Point(1, 1))

def test_distance_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_within_distance(Point(0, 0), Point(10, 0), 5)

def test_crs_failure():
    with pytest.raises(pytest.fail.Exception):
        assert_crs_is_geographic("EPSG:3857")
