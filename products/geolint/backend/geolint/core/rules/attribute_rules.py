"""Attribute validation rules."""

from __future__ import annotations

import time
from datetime import datetime
from typing import Any, Optional

import geopandas as gpd
import numpy as np
import pandas as pd

from geolint.core.rules.base import BaseRule, RuleCategory, RuleIssue, RuleResult, Severity
from geolint.core.rules.registry import RuleRegistry

_MAX_ISSUES = 100


def _cap_issues(issues: list[RuleIssue]) -> list[RuleIssue]:
    return issues[:_MAX_ISSUES]


@RuleRegistry.register
class AttributeCompletenessRule(BaseRule):
    rule_id = "attribute_completeness"
    name = "Attribute Completeness"
    description = "Ensure required fields are non-null."
    category = RuleCategory.ATTRIBUTES
    default_severity = Severity.ERROR
    default_params = {"required_fields": []}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        required = self.params.get("required_fields", [])
        if not required:
            required = list(gdf.columns)
            required.remove(gdf.geometry.name)
        for field in required:
            if field not in gdf.columns:
                issues.append(
                    RuleIssue(
                        issue_type="missing_field",
                        message=f"Required field '{field}' is missing.",
                        severity=self.default_severity,
                        suggested_fix=f"Add column '{field}' to dataset.",
                    )
                )
                if len(issues) >= _MAX_ISSUES:
                    break
                continue
            null_mask = gdf[field].isna() | (gdf[field] == "")
            for idx in gdf[null_mask].index[:_MAX_ISSUES]:
                issues.append(
                    RuleIssue(
                        feature_index=int(idx),
                        issue_type="null_attribute",
                        message=f"Field '{field}' is null or empty at index {idx}.",
                        severity=self.default_severity,
                        suggested_fix=f"Populate value for '{field}'.",
                    )
                )
                if len(issues) >= _MAX_ISSUES:
                    break
            if len(issues) >= _MAX_ISSUES:
                break
        score = 100.0 if not issues else max(0.0, 100.0 - len(issues) * 2.0)
        status = "passed" if not issues else "failed"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="All required fields are complete." if not issues else f"{len(issues)} completeness issues found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class AttributeTypeCheckRule(BaseRule):
    rule_id = "attribute_type_check"
    name = "Attribute Type Check"
    description = "Ensure columns match expected types."
    category = RuleCategory.ATTRIBUTES
    default_severity = Severity.ERROR
    default_params = {"expected_types": {}}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        expected = self.params.get("expected_types", {})
        for col, expected_type in expected.items():
            if col not in gdf.columns:
                issues.append(
                    RuleIssue(
                        issue_type="missing_column",
                        message=f"Column '{col}' not found for type check.",
                        severity=self.default_severity,
                    )
                )
                continue
            actual = str(gdf[col].dtype)
            if expected_type.lower() not in actual.lower():
                issues.append(
                    RuleIssue(
                        issue_type="type_mismatch",
                        message=f"Column '{col}' expected {expected_type}, got {actual}.",
                        severity=self.default_severity,
                        suggested_fix=f"Cast column '{col}' to {expected_type}.",
                    )
                )
            if len(issues) >= _MAX_ISSUES:
                break
        score = 100.0 if not issues else max(0.0, 100.0 - len(issues) * 5.0)
        status = "passed" if not issues else "failed"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="Attribute types match expectations." if not issues else f"{len(issues)} type mismatches found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class AttributeRangeCheckRule(BaseRule):
    rule_id = "attribute_range_check"
    name = "Attribute Range Check"
    description = "Ensure numeric values are within bounds."
    category = RuleCategory.ATTRIBUTES
    default_severity = Severity.WARNING
    default_params = {"ranges": {}}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        ranges = self.params.get("ranges", {})
        for col, bounds in ranges.items():
            if col not in gdf.columns:
                continue
            lo, hi = bounds.get("min", -np.inf), bounds.get("max", np.inf)
            for idx, val in gdf[col].items():
                try:
                    v = float(val)
                    if v < lo or v > hi:
                        issues.append(
                            RuleIssue(
                                feature_index=int(idx),
                                issue_type="out_of_range",
                                message=f"Value {v} in '{col}' at index {idx} is outside [{lo}, {hi}].",
                                severity=self.default_severity,
                                suggested_fix=f"Adjust value to be within [{lo}, {hi}].",
                            )
                        )
                        if len(issues) >= _MAX_ISSUES:
                            break
                except (ValueError, TypeError):
                    pass
            if len(issues) >= _MAX_ISSUES:
                break
        score = 100.0 if not issues else max(0.0, 100.0 - len(issues) * 2.0)
        status = "passed" if not issues else "warning"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="All values within range." if not issues else f"{len(issues)} out-of-range values found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class UniqueIdCheckRule(BaseRule):
    rule_id = "unique_id_check"
    name = "Unique ID Check"
    description = "Ensure ID columns contain unique values."
    category = RuleCategory.ATTRIBUTES
    default_severity = Severity.ERROR
    default_params = {"id_column": "id"}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        col = self.params.get("id_column", "id")
        if col not in gdf.columns:
            issues.append(
                RuleIssue(
                    issue_type="missing_id_column",
                    message=f"ID column '{col}' not found.",
                    severity=self.default_severity,
                    suggested_fix=f"Add or rename column to '{col}'.",
                )
            )
        else:
            dups = gdf[col][gdf[col].duplicated(keep=False)]
            for idx, val in dups.items():
                issues.append(
                    RuleIssue(
                        feature_index=int(idx),
                        issue_type="duplicate_id",
                        message=f"Duplicate ID '{val}' at index {idx}.",
                        severity=self.default_severity,
                        suggested_fix="Assign a unique identifier.",
                    )
                )
                if len(issues) >= _MAX_ISSUES:
                    break
        score = 100.0 if not issues else max(0.0, 100.0 - len(issues) * 5.0)
        status = "passed" if not issues else "failed"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="All IDs are unique." if not issues else f"{len(issues)} duplicate IDs found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class EnumValueCheckRule(BaseRule):
    rule_id = "enum_value_check"
    name = "Enum Value Check"
    description = "Ensure values match an allowed set."
    category = RuleCategory.ATTRIBUTES
    default_severity = Severity.ERROR
    default_params = {"columns": {}}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        columns = self.params.get("columns", {})
        for col, allowed in columns.items():
            if col not in gdf.columns:
                continue
            allowed_set = set(allowed)
            for idx, val in gdf[col].items():
                if pd.isna(val):
                    continue
                if val not in allowed_set:
                    issues.append(
                        RuleIssue(
                            feature_index=int(idx),
                            issue_type="invalid_enum",
                            message=f"Value '{val}' in '{col}' at index {idx} is not in allowed set.",
                            severity=self.default_severity,
                            suggested_fix=f"Use one of: {allowed}.",
                        )
                    )
                    if len(issues) >= _MAX_ISSUES:
                        break
            if len(issues) >= _MAX_ISSUES:
                break
        score = 100.0 if not issues else max(0.0, 100.0 - len(issues) * 2.0)
        status = "passed" if not issues else "failed"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="All enum values are valid." if not issues else f"{len(issues)} invalid enum values found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class DateFormatCheckRule(BaseRule):
    rule_id = "date_format_check"
    name = "Date Format Check"
    description = "Ensure date strings parse correctly."
    category = RuleCategory.ATTRIBUTES
    default_severity = Severity.WARNING
    default_params = {"columns": [], "format": "%Y-%m-%d"}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        cols = self.params.get("columns", [])
        fmt = self.params.get("format", "%Y-%m-%d")
        for col in cols:
            if col not in gdf.columns:
                continue
            for idx, val in gdf[col].items():
                if pd.isna(val) or str(val).strip() == "":
                    continue
                try:
                    datetime.strptime(str(val), fmt)
                except ValueError:
                    issues.append(
                        RuleIssue(
                            feature_index=int(idx),
                            issue_type="bad_date_format",
                            message=f"Date '{val}' in '{col}' at index {idx} does not match format '{fmt}'.",
                            severity=self.default_severity,
                            suggested_fix=f"Format date as '{fmt}'.",
                        )
                    )
                    if len(issues) >= _MAX_ISSUES:
                        break
            if len(issues) >= _MAX_ISSUES:
                break
        score = 100.0 if not issues else max(0.0, 100.0 - len(issues) * 2.0)
        status = "passed" if not issues else "warning"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="All dates parse correctly." if not issues else f"{len(issues)} date format issues found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )
