"""Tests for CRS validators."""

import pytest
from pytest_geospatial.validators import (
    assert_crs_equal,
    assert_crs_is_geographic,
    assert_crs_is_projected,
)


def test_crs_equal_pass():
    assert_crs_equal("EPSG:4326", "EPSG:4326")


def test_crs_equal_fail():
    with pytest.raises(pytest.fail.Exception):
        assert_crs_equal("EPSG:4326", "EPSG:3857")


def test_crs_is_geographic_pass():
    assert_crs_is_geographic("EPSG:4326")


def test_crs_is_geographic_fail():
    with pytest.raises(pytest.fail.Exception):
        assert_crs_is_geographic("EPSG:3857")


def test_crs_is_projected_pass():
    assert_crs_is_projected("EPSG:3857")


def test_crs_is_projected_fail():
    with pytest.raises(pytest.fail.Exception):
        assert_crs_is_projected("EPSG:4326")
