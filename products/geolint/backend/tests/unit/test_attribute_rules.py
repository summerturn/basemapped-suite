"""Unit tests for attribute rules."""

from __future__ import annotations

import geopandas as gpd
import numpy as np
import pandas as pd
import pytest
from shapely.geometry import Point

from geolint.core.rules.attribute_rules import (
    AttributeCompletenessRule,
    AttributeRangeCheckRule,
    AttributeTypeCheckRule,
    DateFormatCheckRule,
    EnumValueCheckRule,
    UniqueIdCheckRule,
)


class TestAttributeCompletenessRule:
    def test_complete(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"name": ["A", "B"], "value": [1, 2]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = AttributeCompletenessRule(params={"required_fields": ["name"]})
        result = rule.execute(gdf, {})
        assert result.status == "passed"

    def test_missing_field(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"name": ["A", "B"]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = AttributeCompletenessRule(params={"required_fields": ["missing"]})
        result = rule.execute(gdf, {})
        assert result.status == "failed"
        assert result.issue_count == 1

    def test_null_values(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"name": ["A", None]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = AttributeCompletenessRule(params={"required_fields": ["name"]})
        result = rule.execute(gdf, {})
        assert result.status == "failed"
        assert result.issue_count == 1

    def test_empty_string(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"name": ["A", ""]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = AttributeCompletenessRule(params={"required_fields": ["name"]})
        result = rule.execute(gdf, {})
        assert result.status == "failed"
        assert result.issue_count == 1


class TestAttributeTypeCheckRule:
    def test_correct_types(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"count": [1, 2], "label": ["a", "b"]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = AttributeTypeCheckRule(params={"expected_types": {"count": "int64"}})
        result = rule.execute(gdf, {})
        assert result.status == "passed"

    def test_wrong_type(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"count": ["a", "b"]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = AttributeTypeCheckRule(params={"expected_types": {"count": "int64"}})
        result = rule.execute(gdf, {})
        assert result.status == "failed"
        assert result.issue_count == 1


class TestAttributeRangeCheckRule:
    def test_in_range(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"temp": [10.0, 20.0, 30.0]},
            geometry=[Point(0, 0), Point(1, 1), Point(2, 2)],
            crs="EPSG:4326",
        )
        rule = AttributeRangeCheckRule(params={"ranges": {"temp": {"min": 0, "max": 50}}})
        result = rule.execute(gdf, {})
        assert result.status == "passed"

    def test_out_of_range(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"temp": [10.0, 100.0]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = AttributeRangeCheckRule(params={"ranges": {"temp": {"min": 0, "max": 50}}})
        result = rule.execute(gdf, {})
        assert result.status == "warning"
        assert result.issue_count == 1


class TestUniqueIdCheckRule:
    def test_unique(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"id": [1, 2, 3]},
            geometry=[Point(0, 0), Point(1, 1), Point(2, 2)],
            crs="EPSG:4326",
        )
        rule = UniqueIdCheckRule(params={"id_column": "id"})
        result = rule.execute(gdf, {})
        assert result.status == "passed"

    def test_duplicates(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"id": [1, 2, 1]},
            geometry=[Point(0, 0), Point(1, 1), Point(2, 2)],
            crs="EPSG:4326",
        )
        rule = UniqueIdCheckRule(params={"id_column": "id"})
        result = rule.execute(gdf, {})
        assert result.status == "failed"
        assert result.issue_count == 2  # both duplicate rows flagged

    def test_missing_column(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"name": ["A", "B"]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = UniqueIdCheckRule(params={"id_column": "id"})
        result = rule.execute(gdf, {})
        assert result.status == "failed"
        assert result.issue_count == 1


class TestEnumValueCheckRule:
    def test_valid_enum(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"status": ["active", "inactive", "active"]},
            geometry=[Point(0, 0), Point(1, 1), Point(2, 2)],
            crs="EPSG:4326",
        )
        rule = EnumValueCheckRule(params={"columns": {"status": ["active", "inactive"]}})
        result = rule.execute(gdf, {})
        assert result.status == "passed"

    def test_invalid_enum(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"status": ["active", "unknown"]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = EnumValueCheckRule(params={"columns": {"status": ["active", "inactive"]}})
        result = rule.execute(gdf, {})
        assert result.status == "failed"
        assert result.issue_count == 1


class TestDateFormatCheckRule:
    def test_valid_dates(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"created": ["2023-01-01", "2023-12-31"]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = DateFormatCheckRule(params={"columns": ["created"], "format": "%Y-%m-%d"})
        result = rule.execute(gdf, {})
        assert result.status == "passed"

    def test_invalid_date(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"created": ["2023-01-01", "not-a-date"]},
            geometry=[Point(0, 0), Point(1, 1)],
            crs="EPSG:4326",
        )
        rule = DateFormatCheckRule(params={"columns": ["created"], "format": "%Y-%m-%d"})
        result = rule.execute(gdf, {})
        assert result.status == "warning"
        assert result.issue_count == 1

    def test_null_dates_skipped(self) -> None:
        gdf = gpd.GeoDataFrame(
            {"created": ["2023-01-01", None, ""]},
            geometry=[Point(0, 0), Point(1, 1), Point(2, 2)],
            crs="EPSG:4326",
        )
        rule = DateFormatCheckRule(params={"columns": ["created"], "format": "%Y-%m-%d"})
        result = rule.execute(gdf, {})
        assert result.status == "passed"
