"""CRS validation rules."""

from __future__ import annotations

import time
from typing import Any

import geopandas as gpd

from geolint.core.rules.base import BaseRule, RuleCategory, RuleIssue, RuleResult, Severity
from geolint.core.rules.registry import RuleRegistry


@RuleRegistry.register
class CRSDefinedRule(BaseRule):
    rule_id = "crs_defined"
    name = "CRS Defined"
    description = "Check that the dataset has a non-null CRS."
    category = RuleCategory.CRS
    default_severity = Severity.ERROR

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        if gdf.crs is None:
            issues.append(
                RuleIssue(
                    issue_type="missing_crs",
                    message="Dataset CRS is undefined.",
                    severity=self.default_severity,
                    suggested_fix="Assign a CRS using set_crs(epsg_code).",
                )
            )
        score = 100.0 if not issues else 0.0
        status = "passed" if not issues else "failed"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="CRS is defined." if not issues else "CRS is missing.",
            issue_count=len(issues),
            issues=issues,
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class CRSConsistencyRule(BaseRule):
    rule_id = "crs_consistency"
    name = "CRS Consistency"
    description = "Verify all features match the expected EPSG code."
    category = RuleCategory.CRS
    default_severity = Severity.ERROR
    default_params = {"expected_epsg": 4326}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        expected = self.params.get("expected_epsg", 4326)
        expected_str = f"EPSG:{expected}"
        actual = gdf.crs.to_string() if gdf.crs else None
        if actual is None:
            issues.append(
                RuleIssue(
                    issue_type="missing_crs",
                    message="Dataset CRS is undefined.",
                    severity=self.default_severity,
                )
            )
        elif actual != expected_str:
            issues.append(
                RuleIssue(
                    issue_type="crs_mismatch",
                    message=f"Dataset CRS is {actual}, expected {expected_str}.",
                    severity=self.default_severity,
                    suggested_fix=f"Reproject to {expected_str} using to_crs().",
                )
            )
        score = 100.0 if not issues else 0.0
        status = "passed" if not issues else "failed"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="CRS matches expected EPSG." if not issues else f"CRS mismatch: expected {expected_str}.",
            issue_count=len(issues),
            issues=issues,
            execution_time_ms=elapsed,
        )
