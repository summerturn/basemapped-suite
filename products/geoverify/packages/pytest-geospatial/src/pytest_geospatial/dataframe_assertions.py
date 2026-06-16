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

"""GeoDataFrame-level assertions using GeoPandas 0.14+."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from pyproj import CRS

if TYPE_CHECKING:
    import geopandas as gpd


def assert_geodataframe_valid(gdf: gpd.GeoDataFrame, msg: str | None = None) -> None:
    """Assert that all geometries in *gdf* are valid.

    Parameters
    ----------
    gdf:
        The GeoDataFrame to validate.
    msg:
        Optional custom message on failure.
    """
    if not gdf.geometry.is_valid.all():
        invalid = int((~gdf.geometry.is_valid).sum())
        default = f"GeoDataFrame contains {invalid} invalid geometry(ies)."
        pytest.fail(msg or default)


def assert_geodataframe_crs(
    gdf: gpd.GeoDataFrame, expected_crs: str | CRS, msg: str | None = None
) -> None:
    """Assert that the CRS of *gdf* matches *expected_crs*.

    Parameters
    ----------
    gdf:
        The GeoDataFrame whose CRS is checked.
    expected_crs:
        Expected CRS as an EPSG string, WKT, or :class:`pyproj.CRS`.
    msg:
        Optional custom message on failure.
    """
    if gdf.crs is None:
        pytest.fail(msg or "GeoDataFrame has no CRS.")

    expected = CRS.from_user_input(expected_crs)
    if not gdf.crs.equals(expected):
        default = (
            f"CRS mismatch.\n"
            f"  Actual:   {gdf.crs.to_string()}\n"
            f"  Expected: {expected.to_string()}"
        )
        pytest.fail(msg or default)


def assert_no_overlaps(gdf: gpd.GeoDataFrame, msg: str | None = None) -> None:
    """Assert that no two geometries in *gdf* overlap.

    Parameters
    ----------
    gdf:
        The GeoDataFrame to check.
    msg:
        Optional custom message on failure.
    """
    geoms = list(gdf.geometry)
    n = len(geoms)
    for i in range(n):
        for j in range(i + 1, n):
            if geoms[i].overlaps(geoms[j]):
                default = f"Overlapping geometries found at rows {i} and {j}."
                pytest.fail(msg or default)


def assert_bounds_within(
    gdf: gpd.GeoDataFrame,
    minx: float,
    miny: float,
    maxx: float,
    maxy: float,
    msg: str | None = None,
) -> None:
    """Assert that the total bounds of *gdf* lie within the given bbox.

    Parameters
    ----------
    gdf:
        The GeoDataFrame to check.
    minx, miny, maxx, maxy:
        Bounding box limits.
    msg:
        Optional custom message on failure.
    """
    bounds = gdf.total_bounds
    if bounds[0] < minx or bounds[1] < miny or bounds[2] > maxx or bounds[3] > maxy:
        default = (
            f"GeoDataFrame bounds {tuple(bounds)} exceed allowed box "
            f"({minx}, {miny}, {maxx}, {maxy})."
        )
        pytest.fail(msg or default)


def assert_row_count(
    gdf: gpd.GeoDataFrame,
    min_rows: int | None = None,
    max_rows: int | None = None,
    msg: str | None = None,
) -> None:
    """Assert that the number of rows in *gdf* is within the given range.

    Parameters
    ----------
    gdf:
        The GeoDataFrame to check.
    min_rows:
        Optional minimum row count (inclusive).
    max_rows:
        Optional maximum row count (inclusive).
    msg:
        Optional custom message on failure.
    """
    count = len(gdf)
    if min_rows is not None and count < min_rows:
        default = f"Row count ({count}) is less than minimum ({min_rows})."
        pytest.fail(msg or default)
    if max_rows is not None and count > max_rows:
        default = f"Row count ({count}) is greater than maximum ({max_rows})."
        pytest.fail(msg or default)


def assert_column_exists(
    gdf: gpd.GeoDataFrame, column: str, msg: str | None = None
) -> None:
    """Assert that *column* exists in *gdf*.

    Parameters
    ----------
    gdf:
        The GeoDataFrame to check.
    column:
        Column name to look for.
    msg:
        Optional custom message on failure.
    """
    if column not in gdf.columns:
        default = f"Column '{column}' not found in GeoDataFrame."
        pytest.fail(msg or default)


def assert_geometry_type(
    gdf: gpd.GeoDataFrame, geom_type: str, msg: str | None = None
) -> None:
    """Assert that every geometry in *gdf* is of type *geom_type*.

    Parameters
    ----------
    gdf:
        The GeoDataFrame to check.
    geom_type:
        Expected geometry type, e.g. ``"Point"`` or ``"Polygon"``.
    msg:
        Optional custom message on failure.
    """
    if not (gdf.geometry.geom_type == geom_type).all():
        unique = gdf.geometry.geom_type.unique().tolist()
        default = f"Expected all geometries to be '{geom_type}', found {unique}."
        pytest.fail(msg or default)
