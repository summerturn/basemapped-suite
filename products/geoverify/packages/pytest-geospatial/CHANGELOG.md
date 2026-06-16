# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-21

### Added
- Initial release of `pytest-geospatial`.
- Geometry assertions: `assert_geometry_valid`, `assert_geometry_equals`, `assert_geometry_contains`, `assert_geometry_intersects`, `assert_within_distance`, `assert_area_within`, `assert_is_simple`, `assert_is_ring`.
- GeoDataFrame assertions: `assert_geodataframe_valid`, `assert_geodataframe_crs`, `assert_no_overlaps`, `assert_bounds_within`, `assert_row_count`, `assert_column_exists`, `assert_geometry_type`.
- CRS validators: `assert_crs_equal`, `assert_crs_is_projected`, `assert_crs_is_geographic`.
- Built-in pytest fixtures: `geo_tolerance`, `sample_point`, `sample_polygon`, `sample_geodataframe`, `epsg_4326`, `epsg_3857`.
- CLI options: `--geo-tolerance`, `--geo-strict`, `--geo-report`.
- Custom markers: `geo`, `slow_geo`, `crs`.
- GeoJSON reporter that emits a structured `geospatial-report.json` after each run.
- Async cloud dashboard client (`CloudClient`) for uploading reports.
