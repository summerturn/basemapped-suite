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

"""Main pytest plugin entry point for pytest-geospatial."""

from __future__ import annotations

from typing import Any

import pytest

from pytest_geospatial import __version__
from pytest_geospatial.reporters import GeoJSONReporter

geo_report_key = pytest.StashKey["GeoJSONReporter"]()


def pytest_addoption(parser: pytest.Parser) -> None:
    """Add geospatial-specific CLI options."""
    group = parser.getgroup("geospatial")
    group.addoption(
        "--geo-tolerance",
        action="store",
        default=1e-6,
        type=float,
        help="Default tolerance for geometry equality comparisons (default: 1e-6).",
    )
    group.addoption(
        "--geo-strict",
        action="store_true",
        default=False,
        help="Fail tests on CRS mismatches even when geometries are topologically equal.",
    )
    group.addoption(
        "--geo-report",
        action="store",
        default="geospatial-report.json",
        help="Path to the JSON report file (default: geospatial-report.json).",
    )


def pytest_configure(config: pytest.Config) -> None:
    """Configure pytest with geospatial markers and reporter."""
    config.addinivalue_line(
        "markers",
        "geo: mark test as a geospatial test that may use spatial assertions.",
    )
    config.addinivalue_line(
        "markers",
        "slow_geo: mark test as a slow geospatial test (e.g., large dataset operations).",
    )
    config.addinivalue_line(
        "markers",
        "crs: mark test as requiring CRS validation or projection logic.",
    )
    reporter = GeoJSONReporter(config.getoption("--geo-report"))
    config.stash[geo_report_key] = reporter


def pytest_sessionstart(session: pytest.Session) -> None:
    """Hook called after the Session object has been created."""
    pass


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Collect test results for the spatial reporter."""
    outcome = yield
    report = outcome.get_result()
    if report.when == "call":
        reporter = item.config.stash.get(geo_report_key, None)
        if reporter is not None:
            reporter.append(report)


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    """Hook called after the whole test run has finished."""
    reporter = session.config.stash.get(geo_report_key, None)
    if reporter is not None:
        reporter.write_json_report()


def pytest_report_header(config: pytest.Config) -> str:
    """Add geospatial plugin version to the pytest report header."""
    return f"pytest-geospatial: {__version__}"


# Import fixtures so they are registered as part of the plugin.
from pytest_geospatial.fixtures import *  # noqa: F401,E402
