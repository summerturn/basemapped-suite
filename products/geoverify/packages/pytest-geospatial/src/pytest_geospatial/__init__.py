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

"""pytest-geospatial: A pytest plugin for geospatial assertions."""

import pytest

__version__ = "0.1.0"

pytest.register_assert_rewrite("pytest_geospatial.assertions")
pytest.register_assert_rewrite("pytest_geospatial.validators")
pytest.register_assert_rewrite("pytest_geospatial.dataframe_assertions")

from pytest_geospatial.assertions import (
    assert_area_within,
    assert_geometry_contains,
    assert_geometry_equals,
    assert_geometry_intersects,
    assert_geometry_valid,
    assert_is_ring,
    assert_is_simple,
    assert_within_distance,
)
from pytest_geospatial.dataframe_assertions import (
    assert_bounds_within,
    assert_column_exists,
    assert_geodataframe_crs,
    assert_geodataframe_valid,
    assert_geometry_type,
    assert_no_overlaps,
    assert_row_count,
)
from pytest_geospatial.exceptions import CRSValidationError, GeospatialAssertionError
from pytest_geospatial.validators import (
    assert_crs_equal,
    assert_crs_is_geographic,
    assert_crs_is_projected,
)

__all__ = [
    "__version__",
    "assert_area_within",
    "assert_bounds_within",
    "assert_column_exists",
    "assert_crs_equal",
    "assert_crs_is_geographic",
    "assert_crs_is_projected",
    "assert_geodataframe_crs",
    "assert_geodataframe_valid",
    "assert_geometry_contains",
    "assert_geometry_equals",
    "assert_geometry_intersects",
    "assert_geometry_type",
    "assert_geometry_valid",
    "assert_is_ring",
    "assert_is_simple",
    "assert_no_overlaps",
    "assert_row_count",
    "assert_within_distance",
    "CRSValidationError",
    "GeospatialAssertionError",
]
