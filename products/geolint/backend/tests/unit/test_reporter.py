"""Unit tests for GeoLint reporters."""

from __future__ import annotations

import json

import geopandas as gpd
import pytest
from shapely.geometry import Point

from geolint.core.ingest.loader import IngestionResult
from geolint.core.reporter import ReportGenerator
from geolint.core.rules.base import RuleCategory, RuleIssue, RuleResult, Severity
from geolint.core.scoring import QualityScoreCalculator


def _make_sample_ingestion() -> IngestionResult:
    gdf = gpd.GeoDataFrame(
        {"id": [1, 2], "name": ["A", "B"]},
        geometry=[Point(0, 0), Point(1, 1)],
        crs="EPSG:4326",
    )
    return IngestionResult(
        format_type="geojson",
        geodataframe=gdf,
        detected_crs="EPSG:4326",
        bbox=(0.0, 0.0, 1.0, 1.0),
        feature_count=2,
        geometry_types=["Point"],
        attribute_schema={"id": "int64", "name": "object"},
        layer_name=None,
        file_size_bytes=256,
        checksum_sha256="abc123",
    )


def _make_sample_results() -> list[RuleResult]:
    return [
        RuleResult(
            rule_id="geometry_validity",
            name="Geometry Validity",
            category=RuleCategory.GEOMETRY,
            severity=Severity.ERROR,
            status="passed",
            score=100.0,
            message="All geometries valid.",
            issue_count=0,
            issues=[],
            execution_time_ms=12.0,
        ),
        RuleResult(
            rule_id="null_geometry",
            name="Null Geometry",
            category=RuleCategory.GEOMETRY,
            severity=Severity.ERROR,
            status="failed",
            score=0.0,
            message="1 null geometry found.",
            issue_count=1,
            issues=[
                RuleIssue(
                    feature_index=0,
                    issue_type="null_geometry",
                    message="NULL geometry at index 0.",
                    severity=Severity.ERROR,
                    suggested_fix="Assign valid geometry.",
                ),
            ],
            execution_time_ms=5.0,
        ),
    ]


def _make_validation_output() -> dict:
    ingestion = _make_sample_ingestion()
    results = _make_sample_results()
    score = QualityScoreCalculator.calculate_overall_score(results)
    return {
        "ingestion": ingestion,
        "rule_results": results,
        "score": score,
        "context": {},
    }


class TestReportGenerator:
    def test_generate_json_report(self) -> None:
        gen = ReportGenerator(_make_validation_output())
        report = gen.generate_json_report()
        # Geometry avg=50, empty categories default to 100 => weighted overall = 85
        assert report["summary"]["overall_score"] == 85.0
        assert report["summary"]["grade"] == "B"
        assert len(report["rules"]) == 2
        assert report["rules"][0]["rule_id"] == "geometry_validity"

    def test_generate_html_report(self) -> None:
        gen = ReportGenerator(_make_validation_output())
        html = gen.generate_html_report()
        assert "<html" in html
        assert "GeoLint Quality Report" in html
        assert "geometry_validity" in html
        assert "null_geometry" in html

    def test_generate_csv_issues(self) -> None:
        gen = ReportGenerator(_make_validation_output())
        csv_text = gen.generate_csv_issues()
        lines = csv_text.strip().split("\n")
        assert lines[0].startswith("rule_id")
        assert len(lines) == 2  # header + 1 issue
        assert "null_geometry" in csv_text

    def test_generate_geojson_flagged(self) -> None:
        gen = ReportGenerator(_make_validation_output())
        geojson = gen.generate_geojson_flagged()
        assert geojson["type"] == "FeatureCollection"
        assert len(geojson["features"]) == 1
        assert "geolint_issues" in geojson["features"][0]["properties"]

    def test_generate_geojson_no_flagged(self) -> None:
        ingestion = _make_sample_ingestion()
        results = [
            RuleResult(
                rule_id="geometry_validity",
                name="Geometry Validity",
                category=RuleCategory.GEOMETRY,
                severity=Severity.ERROR,
                status="passed",
                score=100.0,
                message="All valid.",
                issue_count=0,
                issues=[],
            ),
        ]
        score = QualityScoreCalculator.calculate_overall_score(results)
        gen = ReportGenerator({"ingestion": ingestion, "rule_results": results, "score": score, "context": {}})
        geojson = gen.generate_geojson_flagged()
        assert geojson["features"] == []

    def test_generate_summary_card(self) -> None:
        gen = ReportGenerator(_make_validation_output())
        card = gen.generate_summary_card()
        assert card["grade"] == "B"
        assert card["overall_score"] == 85.0
        assert card["total_issues"] == 1
        assert card["errors"] == 1
        assert card["rules_run"] == 2
        assert card["rules_failed"] == 1
