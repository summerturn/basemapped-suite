# pytest-geospatial

[![PyPI version](https://badge.fury.io/py/pytest-geospatial.svg)](https://badge.fury.io/py/pytest-geospatial)
[![Python versions](https://img.shields.io/pypi/pyversions/pytest-geospatial.svg)](https://pypi.org/project/pytest-geospatial/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/pytest-geospatial/pytest-geospatial/actions/workflows/ci.yml/badge.svg)](https://github.com/pytest-geospatial/pytest-geospatial/actions)

A pytest plugin that provides rich, domain-specific assertions and fixtures for geospatial Python applications. Built on top of [Shapely](https://shapely.readthedocs.io/), [GeoPandas](https://geopandas.org/), and [pyproj](https://pyproj4.github.io/pyproj/stable/), it helps you write clearer, more robust tests for GIS code.

---

## Installation

```bash
pip install pytest-geospatial
```

With development dependencies:

```bash
pip install pytest-geospatial[dev]
```

---

## Quick Start

Once installed, the plugin is automatically discovered by pytest. Import the assertion helpers directly in your tests:

```python
import geopandas as gpd
from shapely.geometry import Point, Polygon

from pytest_geospatial import (
    assert_geometry_valid,
    assert_geometry_equals,
    assert_geodataframe_crs,
    assert_crs_equal,
)

def test_polygon_is_valid():
    poly = Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])
    assert_geometry_valid(poly)

def test_point_within_tolerance():
    p1 = Point(0, 0)
    p2 = Point(1e-9, 1e-9)
    assert_geometry_equals(p1, p2, tolerance=1e-6)

def test_geodataframe_crs():
    gdf = gpd.GeoDataFrame(
        {"id": [1, 2]},
        geometry=[Point(0, 0), Point(1, 1)],
        crs="EPSG:4326",
    )
    assert_geodataframe_crs(gdf, "EPSG:4326")
    assert_crs_equal(gdf, "EPSG:4326")
```

Run with the geospatial report flag to emit a structured JSON summary:

```bash
pytest --geo-report=report.json
```

---

## Assertion API Reference

### Geometry Assertions (`pytest_geospatial.assertions`)

| Function | Description |
|----------|-------------|
| `assert_geometry_valid(geom, msg=None)` | Assert that a Shapely geometry is valid. |
| `assert_geometry_equals(actual, expected, tolerance=1e-6, msg=None)` | Assert two geometries are equal within a coordinate tolerance. |
| `assert_geometry_contains(container, contained, msg=None)` | Assert that *container* fully contains *contained*. |
| `assert_geometry_intersects(g1, g2, msg=None)` | Assert that two geometries intersect. |
| `assert_within_distance(g1, g2, max_distance, msg=None)` | Assert distance between geometries is ≤ *max_distance*. |
| `assert_area_within(geom, min_area=None, max_area=None, msg=None)` | Assert geometry area lies within bounds. |
| `assert_is_simple(linestring, msg=None)` | Assert a LineString is simple (no self-intersections). |
| `assert_is_ring(linestring, msg=None)` | Assert a LineString is a ring (closed and simple). |

### GeoDataFrame Assertions (`pytest_geospatial.dataframe_assertions`)

| Function | Description |
|----------|-------------|
| `assert_geodataframe_valid(gdf, msg=None)` | Assert all geometries in a GeoDataFrame are valid. |
| `assert_geodataframe_crs(gdf, expected_crs, msg=None)` | Assert GeoDataFrame CRS matches *expected_crs*. |
| `assert_no_overlaps(gdf, msg=None)` | Assert no two geometries in the GeoDataFrame overlap. |
| `assert_bounds_within(gdf, minx, miny, maxx, maxy, msg=None)` | Assert total bounds lie inside a bbox. |
| `assert_row_count(gdf, min_rows=None, max_rows=None, msg=None)` | Assert row count is within range. |
| `assert_column_exists(gdf, column, msg=None)` | Assert a named column exists. |
| `assert_geometry_type(gdf, geom_type, msg=None)` | Assert every geometry is of type *geom_type*. |

### CRS Validators (`pytest_geospatial.validators`)

| Function | Description |
|----------|-------------|
| `assert_crs_equal(actual, expected, msg=None)` | Assert two CRS representations are equivalent. |
| `assert_crs_is_projected(obj, msg=None)` | Assert CRS is projected (not geographic). |
| `assert_crs_is_geographic(obj, msg=None)` | Assert CRS is geographic. |

### Fixtures

The plugin automatically registers the following fixtures:

| Fixture | Description |
|---------|-------------|
| `geo_tolerance` | Returns the value of `--geo-tolerance` (default `1e-6`). |
| `sample_point` | A `Point(0, 0)` in EPSG:4326. |
| `sample_polygon` | A unit-square `Polygon` in EPSG:4326. |
| `sample_geodataframe` | A `GeoDataFrame` with three points in EPSG:4326. |
| `epsg_4326` | A `pyproj.CRS` for WGS-84. |
| `epsg_3857` | A `pyproj.CRS` for Web Mercator. |

---

## CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--geo-tolerance` | `1e-6` | Default tolerance for geometry equality comparisons. |
| `--geo-strict` | `False` | Fail tests on CRS mismatches even when geometries are topologically equal. |
| `--geo-report` | `geospatial-report.json` | Path to the structured JSON report file. |

---

## Markers

The plugin registers custom markers for selective test execution:

- `@pytest.mark.geo` — General geospatial tests.
- `@pytest.mark.slow_geo` — Slow tests (e.g., large dataset operations).
- `@pytest.mark.crs` — Tests requiring CRS validation or projection logic.

Run only geospatial tests:

```bash
pytest -m geo
```

---

## CI Integration

Add the following step to your GitHub Actions workflow (or equivalent CI system):

```yaml
- name: Run geospatial tests
  run: |
    pip install pytest-geospatial[dev]
    pytest --geo-report=geospatial-report.json --cov=src --cov-report=xml

- name: Upload geospatial report
  uses: actions/upload-artifact@v4
  with:
    name: geospatial-report
    path: geospatial-report.json
```

The generated JSON report contains per-test outcomes, durations, and marker metadata:

```json
{
  "summary": { "total": 42, "passed": 40, "failed": 2, "skipped": 0 },
  "results": [
    {
      "nodeid": "tests/test_assertions.py::test_polygon_is_valid",
      "outcome": "passed",
      "duration": 0.00123,
      "markers": ["geo"]
    }
  ]
}
```

---

## Cloud Dashboard

Upload your geospatial reports to the cloud dashboard for team-wide visibility:

```python
import asyncio
from pytest_geospatial.cloud_client import CloudClient

async def upload():
    client = CloudClient(
        base_url="https://dashboard.geospatial.dev",
        api_token="${GEO_API_TOKEN}",
    )
    await client.upload_report("geospatial-report.json")

asyncio.run(upload())
```

Learn more at [https://pytest-geospatial.readthedocs.io/cloud](https://pytest-geospatial.readthedocs.io/cloud).

---

## License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.
