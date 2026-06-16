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

"""CRS validators using pyproj."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from pyproj import CRS

from pytest_geospatial.exceptions import CRSValidationError

if TYPE_CHECKING:
    import geopandas as gpd

    from pytest_geospatial.types import CRSInput


def _extract_crs(obj: CRSInput) -> CRS:
    """Extract a :class:`pyproj.CRS` from a variety of input types.

    Supports ``pyproj.CRS``, EPSG code strings (e.g. ``"EPSG:4326"``),
    WKT/PROJ strings, ``geopandas.GeoDataFrame``, and
    ``geopandas.GeoSeries``.

    Parameters
    ----------
    obj:
        The object from which to extract a CRS.

    Returns
    -------
    CRS
        The extracted CRS.

    Raises
    ------
    CRSValidationError
        If the object has no CRS or cannot be parsed.
    """
    if isinstance(obj, CRS):
        return obj

    if isinstance(obj, str):
        try:
            return CRS.from_user_input(obj)
        except Exception as exc:
            raise CRSValidationError(
                f"Unable to parse CRS from string: {obj!r} ({exc})"
            ) from exc

    # Duck-type geopandas objects
    crs = getattr(obj, "crs", None)
    if crs is None:
        raise CRSValidationError(
            f"Object of type {type(obj).__name__!r} has no CRS attribute."
        )

    if isinstance(crs, CRS):
        return crs

    # GeoDataFrame.crs may be a string or dict-like depending on the version
    try:
        return CRS.from_user_input(crs)
    except Exception as exc:
        raise CRSValidationError(
            f"Unable to parse CRS from {type(obj).__name__!r}: {crs!r} ({exc})"
        ) from exc


def assert_crs_equal(
    actual: CRSInput,
    expected: CRSInput,
    msg: str | None = None,
) -> None:
    """Assert that two CRS representations are equivalent.

    Parameters
    ----------
    actual:
        The observed CRS.
    expected:
        The expected CRS.
    msg:
        Optional custom message on failure.
    """
    actual_crs = _extract_crs(actual)
    expected_crs = _extract_crs(expected)

    if not actual_crs.equals(expected_crs):
        default = (
            f"CRS mismatch.\n"
            f"  Actual:   {actual_crs.to_string()}\n"
            f"  Expected: {expected_crs.to_string()}"
        )
        pytest.fail(msg or default)


def assert_crs_is_projected(
    obj: CRSInput,
    msg: str | None = None,
) -> None:
    """Assert that the CRS of *obj* is projected (not geographic).

    Parameters
    ----------
    obj:
        The object whose CRS is to be checked.
    msg:
        Optional custom message on failure.
    """
    crs = _extract_crs(obj)
    if not crs.is_projected:
        default = f"CRS is not projected: {crs.to_string()}"
        pytest.fail(msg or default)


def assert_crs_is_geographic(
    obj: CRSInput,
    msg: str | None = None,
) -> None:
    """Assert that the CRS of *obj* is geographic.

    Parameters
    ----------
    obj:
        The object whose CRS is to be checked.
    msg:
        Optional custom message on failure.
    """
    crs = _extract_crs(obj)
    if not crs.is_geographic:
        default = f"CRS is not geographic: {crs.to_string()}"
        pytest.fail(msg or default)
