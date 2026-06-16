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

"""pytest fixtures for geospatial testing."""

from __future__ import annotations

import pytest
from pyproj import CRS
from shapely.geometry import Point, Polygon

import geopandas as gpd


@pytest.fixture
def geo_tolerance(request: pytest.FixtureRequest) -> float:
    """Return the tolerance set via ``--geo-tolerance``."""
    return request.config.getoption("--geo-tolerance")


@pytest.fixture
def sample_point() -> Point:
    """Return a sample Point at (0, 0) in EPSG:4326."""
    return Point(0, 0)


@pytest.fixture
def sample_polygon() -> Polygon:
    """Return a unit-square Polygon in EPSG:4326."""
    return Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])


@pytest.fixture
def sample_geodataframe() -> gpd.GeoDataFrame:
    """Return a GeoDataFrame with three sample points in EPSG:4326."""
    return gpd.GeoDataFrame(
        {"id": [1, 2, 3]},
        geometry=[Point(0, 0), Point(1, 1), Point(2, 2)],
        crs="EPSG:4326",
    )


@pytest.fixture
def epsg_4326() -> CRS:
    """Return a :class:`pyproj.CRS` for EPSG:4326."""
    return CRS.from_epsg(4326)


@pytest.fixture
def epsg_3857() -> CRS:
    """Return a :class:`pyproj.CRS` for EPSG:3857."""
    return CRS.from_epsg(3857)
