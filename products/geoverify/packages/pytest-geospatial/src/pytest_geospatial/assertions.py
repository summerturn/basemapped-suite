# MIT License
#
# Copyright (c) 2026 pytest-geospatial contributors
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

"""Core spatial assertion helpers using Shapely 2.0+."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
import shapely
from shapely.validation import explain_validity

if TYPE_CHECKING:
    from shapely.geometry.base import BaseGeometry
    from shapely.geometry.linestring import LineString
    from shapely.geometry.polygon import Polygon


def assert_geometry_valid(geom: BaseGeometry, msg: str | None = None) -> None:
    """Assert that *geom* is a valid Shapely geometry.

    Parameters
    ----------
    geom:
        The geometry to validate.
    msg:
        Optional custom message on failure.
    """
    if not geom.is_valid:
        reason = explain_validity(geom)
        default = f"Geometry is invalid: {reason}"
        pytest.fail(msg or default)


def assert_geometry_equals(
    actual: BaseGeometry,
    expected: BaseGeometry,
    tolerance: float = 1e-6,
    msg: str | None = None,
) -> None:
    """Assert that two geometries are equal within a given tolerance.

    Uses :func:`shapely.equals_exact` for coordinate-level comparison.

    Parameters
    ----------
    actual:
        The observed geometry.
    expected:
        The expected geometry.
    tolerance:
        Maximum coordinate distance for equality (default ``1e-6``).
    msg:
        Optional custom message on failure.
    """
    if not shapely.equals_exact(actual, expected, tolerance=tolerance):
        default = (
            f"Geometries are not equal within tolerance {tolerance}.\n"
            f"  Actual:   {actual.wkt}\n"
            f"  Expected: {expected.wkt}"
        )
        pytest.fail(msg or default)


def assert_geometry_contains(
    container: BaseGeometry,
    contained: BaseGeometry,
    msg: str | None = None,
) -> None:
    """Assert that *container* fully contains *contained*.

    Parameters
    ----------
    container:
        The outer geometry.
    contained:
        The inner geometry.
    msg:
        Optional custom message on failure.
    """
    if not container.contains(contained):
        default = (
            f"Container does not contain the expected geometry.\n"
            f"  Container: {container.wkt}\n"
            f"  Contained: {contained.wkt}"
        )
        pytest.fail(msg or default)


def assert_geometry_intersects(
    g1: BaseGeometry,
    g2: BaseGeometry,
    msg: str | None = None,
) -> None:
    """Assert that two geometries intersect.

    Parameters
    ----------
    g1:
        First geometry.
    g2:
        Second geometry.
    msg:
        Optional custom message on failure.
    """
    if not g1.intersects(g2):
        default = (
            f"Geometries do not intersect.\n"
            f"  Geometry 1: {g1.wkt}\n"
            f"  Geometry 2: {g2.wkt}"
        )
        pytest.fail(msg or default)


def assert_within_distance(
    g1: BaseGeometry,
    g2: BaseGeometry,
    max_distance: float,
    msg: str | None = None,
) -> None:
    """Assert that the distance between *g1* and *g2* is at most *max_distance*.

    Parameters
    ----------
    g1:
        First geometry.
    g2:
        Second geometry.
    max_distance:
        Maximum allowed distance.
    msg:
        Optional custom message on failure.
    """
    distance = g1.distance(g2)
    if distance > max_distance:
        default = (
            f"Distance between geometries ({distance:.6f}) exceeds "
            f"maximum allowed ({max_distance:.6f}).\n"
            f"  Geometry 1: {g1.wkt}\n"
            f"  Geometry 2: {g2.wkt}"
        )
        pytest.fail(msg or default)


def assert_area_within(
    geom: BaseGeometry,
    min_area: float | None = None,
    max_area: float | None = None,
    msg: str | None = None,
) -> None:
    """Assert that the area of *geom* lies within the specified bounds.

    Parameters
    ----------
    geom:
        The geometry to check (typically a Polygon or MultiPolygon).
    min_area:
        Optional minimum area.
    max_area:
        Optional maximum area.
    msg:
        Optional custom message on failure.
    """
    area = float(geom.area)
    if min_area is not None and area < min_area:
        default = (
            f"Geometry area ({area:.6f}) is less than minimum allowed "
            f"({min_area:.6f})."
        )
        pytest.fail(msg or default)
    if max_area is not None and area > max_area:
        default = (
            f"Geometry area ({area:.6f}) is greater than maximum allowed "
            f"({max_area:.6f})."
        )
        pytest.fail(msg or default)


def assert_is_simple(
    linestring: LineString,
    msg: str | None = None,
) -> None:
    """Assert that a LineString is simple (does not self-intersect).

    Parameters
    ----------
    linestring:
        The LineString to test.
    msg:
        Optional custom message on failure.
    """
    if not linestring.is_simple:
        default = f"LineString is not simple: {linestring.wkt}"
        pytest.fail(msg or default)


def assert_is_ring(
    linestring: LineString,
    msg: str | None = None,
) -> None:
    """Assert that a LineString is a ring (closed and simple).

    Parameters
    ----------
    linestring:
        The LineString to test.
    msg:
        Optional custom message on failure.
    """
    if not linestring.is_ring:
        default = f"LineString is not a ring: {linestring.wkt}"
        pytest.fail(msg or default)
