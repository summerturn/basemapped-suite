"""Report generators for GeoLint validation results."""

from __future__ import annotations

import csv
import io
import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

import jinja2

from geolint.core.rules.base import RuleResult, Severity
from geolint.core.scoring import QualityScoreCalculator


class ReportGenerator:
    """Generate various output formats from validation results."""

    def __init__(self, validation_output: dict[str, Any]) -> None:
        self.validation_output = validation_output
        self.ingestion = validation_output["ingestion"]
        self.rule_results = validation_output["rule_results"]
        self.score = validation_output["score"]

    def generate_json_report(self) -> dict[str, Any]:
        """Return a full quality report as a dictionary."""
        return {
            "summary": {
                "overall_score": self.score["overall_score"],
                "grade": self.score["grade"],
                "status": self.score["status"],
                "passes_threshold": self.score["passes_threshold"],
                "feature_count": self.ingestion.feature_count,
                "format_type": self.ingestion.format_type,
                "detected_crs": self.ingestion.detected_crs,
                "bbox": self.ingestion.bbox,
                "geometry_types": self.ingestion.geometry_types,
                "file_size_bytes": self.ingestion.file_size_bytes,
                "checksum_sha256": self.ingestion.checksum_sha256,
            },
            "categories": self.score["categories"],
            "rules": [
                {
                    "rule_id": r.rule_id,
                    "name": r.name,
                    "category": r.category.value,
                    "status": r.status,
                    "score": r.score,
                    "severity": r.severity.value,
                    "message": r.message,
                    "issue_count": r.issue_count,
                    "execution_time_ms": round(r.execution_time_ms, 2),
                    "issues": [
                        {
                            "feature_id": i.feature_id,
                            "feature_index": i.feature_index,
                            "issue_type": i.issue_type,
                            "message": i.message,
                            "severity": i.severity.value,
                            "coordinates": i.coordinates,
                            "suggested_fix": i.suggested_fix,
                        }
                        for i in r.issues
                    ],
                }
                for r in self.rule_results
            ],
        }

    def generate_html_report(self) -> str:
        """Generate an HTML report using Jinja2."""
        base_dir = Path(__file__).parent
        template_dir = base_dir / "templates"
        env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(str(template_dir)),
            autoescape=jinja2.select_autoescape(["html", "xml"]),
        )
        template = env.get_template("report.html")
        report = self.generate_json_report()
        return template.render(report=report)

    def generate_csv_issues(self) -> str:
        """Generate a CSV string of all issues."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "rule_id", "rule_name", "feature_index", "issue_type",
            "message", "severity", "coordinates", "suggested_fix",
        ])
        for r in self.rule_results:
            for i in r.issues:
                writer.writerow([
                    r.rule_id,
                    r.name,
                    i.feature_index,
                    i.issue_type,
                    i.message,
                    i.severity.value,
                    str(i.coordinates) if i.coordinates else "",
                    i.suggested_fix or "",
                ])
        return output.getvalue()

    def generate_geojson_flagged(self) -> dict[str, Any]:
        """Return GeoJSON of features that have at least one issue."""
        gdf = self.ingestion.geodataframe.copy()
        flagged_indices = set()
        for r in self.rule_results:
            for i in r.issues:
                if i.feature_index is not None:
                    flagged_indices.add(i.feature_index)
        if not flagged_indices:
            return {"type": "FeatureCollection", "features": []}
        flagged = gdf.iloc[list(flagged_indices)].copy()
        # Add issue annotations
        annotations: dict[int, list[dict[str, Any]]] = {idx: [] for idx in flagged_indices}
        for r in self.rule_results:
            for i in r.issues:
                if i.feature_index is not None:
                    annotations[i.feature_index].append({
                        "rule_id": r.rule_id,
                        "issue_type": i.issue_type,
                        "message": i.message,
                        "severity": i.severity.value,
                        "suggested_fix": i.suggested_fix,
                    })
        flagged["geolint_issues"] = flagged.index.map(lambda idx: annotations.get(idx, []))
        geojson = json.loads(flagged.to_json())
        return geojson

    def generate_summary_card(self) -> dict[str, Any]:
        """Return a compact summary dict suitable for CI/GitHub Actions."""
        total_issues = sum(r.issue_count for r in self.rule_results)
        error_count = sum(
            1 for r in self.rule_results for i in r.issues if i.severity == Severity.ERROR
        )
        warning_count = sum(
            1 for r in self.rule_results for i in r.issues if i.severity == Severity.WARNING
        )
        return {
            "status": self.score["status"],
            "grade": self.score["grade"],
            "overall_score": self.score["overall_score"],
            "passes_threshold": self.score["passes_threshold"],
            "feature_count": self.ingestion.feature_count,
            "total_issues": total_issues,
            "errors": error_count,
            "warnings": warning_count,
            "rules_run": len(self.rule_results),
            "rules_failed": sum(1 for r in self.rule_results if r.status == "failed"),
        }
