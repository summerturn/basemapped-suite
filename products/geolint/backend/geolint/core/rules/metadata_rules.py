"""Metadata validation rules."""

from __future__ import annotations

import time
from typing import Any

import geopandas as gpd

from geolint.core.rules.base import BaseRule, RuleCategory, RuleIssue, RuleResult, Severity
from geolint.core.rules.registry import RuleRegistry


@RuleRegistry.register
class MetadataPresentRule(BaseRule):
    rule_id = "metadata_present"
    name = "Metadata Present"
    description = "Check that file-level metadata exists."
    category = RuleCategory.METADATA
    default_severity = Severity.WARNING
    default_params = {"required_keys": []}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        meta = context.get("metadata", {})
        required = self.params.get("required_keys", [])
        if not meta:
            issues.append(
                RuleIssue(
                    issue_type="missing_metadata",
                    message="No file-level metadata found.",
                    severity=self.default_severity,
                    suggested_fix="Add metadata tags or JSON sidecar.",
                )
            )
        for key in required:
            if key not in meta:
                issues.append(
                    RuleIssue(
                        issue_type="missing_metadata_key",
                        message=f"Required metadata key '{key}' is missing.",
                        severity=self.default_severity,
                        suggested_fix=f"Add metadata key '{key}'.",
                    )
                )
        score = 100.0 if not issues else max(0.0, 100.0 - len(issues) * 5.0)
        status = "passed" if not issues else "warning"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="Metadata is present." if not issues else f"{len(issues)} metadata issues found.",
            issue_count=len(issues),
            issues=issues,
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class ISO19115ComplianceRule(BaseRule):
    rule_id = "iso_19115_compliance"
    name = "ISO 19115 Compliance"
    description = "Check basic ISO 19115 field presence."
    category = RuleCategory.METADATA
    default_severity = Severity.WARNING
    default_params = {}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        meta = context.get("metadata", {})
        iso_fields = [
            "title",
            "abstract",
            "purpose",
            "keywords",
            "date",
            "creator",
            "publisher",
            "contact",
            "license",
            "extent",
        ]
        for field in iso_fields:
            if field not in meta or not meta[field]:
                issues.append(
                    RuleIssue(
                        issue_type="missing_iso_field",
                        message=f"ISO 19115 field '{field}' is missing or empty.",
                        severity=self.default_severity,
                        suggested_fix=f"Populate ISO 19115 field '{field}'.",
                    )
                )
        score = 100.0 if not issues else max(0.0, 100.0 - len(issues) * 3.0)
        status = "passed" if not issues else "warning"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="Basic ISO 19115 fields present." if not issues else f"{len(issues)} missing ISO fields.",
            issue_count=len(issues),
            issues=issues,
            execution_time_ms=elapsed,
        )
