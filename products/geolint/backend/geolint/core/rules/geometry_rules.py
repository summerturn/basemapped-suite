"""Geometry validation rules."""

from __future__ import annotations

import time
from typing import Any

import geopandas as gpd
import numpy as np
import shapely
from shapely.geometry import Polygon

from geolint.core.rules.base import BaseRule, RuleCategory, RuleIssue, RuleResult, Severity
from geolint.core.rules.registry import RuleRegistry

_MAX_ISSUES = 100


def _cap_issues(issues: list[RuleIssue]) -> list[RuleIssue]:
    return issues[:_MAX_ISSUES]


@RuleRegistry.register
class GeometryValidityRule(BaseRule):
    rule_id = "geometry_validity"
    name = "Geometry Validity"
    description = "Check OGC validity via shapely.is_valid."
    category = RuleCategory.GEOMETRY
    default_severity = Severity.ERROR

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        for idx, geom in enumerate(gdf.geometry):
            if geom is None:
                continue
            if not geom.is_valid:
                issues.append(
                    RuleIssue(
                        feature_index=idx,
                        issue_type="invalid_geometry",
                        message=f"Invalid geometry at index {idx}: {shapely.is_valid_reason(geom)}",
                        severity=self.default_severity,
                        coordinates=(geom.centroid.x, geom.centroid.y) if geom.centroid else None,
                        suggested_fix="Use shapely.make_valid() to repair geometry.",
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
            message="All geometries are valid." if not issues else f"{len(issues)} invalid geometries found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class SelfIntersectionRule(BaseRule):
    rule_id = "self_intersection"
    name = "Self Intersection"
    description = "Detect polygon ring self-intersections."
    category = RuleCategory.GEOMETRY
    default_severity = Severity.ERROR

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        for idx, geom in enumerate(gdf.geometry):
            if geom is None or not geom.is_valid:
                continue
            if geom.geom_type in ("Polygon", "MultiPolygon"):
                if geom.boundary.intersects(geom.boundary):
                    try:
                        if not geom.boundary.is_simple:
                            issues.append(
                                RuleIssue(
                                    feature_index=idx,
                                    issue_type="self_intersection",
                                    message=f"Self-intersecting ring at index {idx}.",
                                    severity=self.default_severity,
                                    suggested_fix="Remove self-intersections or use make_valid().",
                                )
                            )
                            if len(issues) >= _MAX_ISSUES:
                                break
                    except Exception:
                        pass
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
            message="No self-intersections." if not issues else f"{len(issues)} self-intersections found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class NullGeometryRule(BaseRule):
    rule_id = "null_geometry"
    name = "Null Geometry"
    description = "Detect NULL or empty geometries."
    category = RuleCategory.GEOMETRY
    default_severity = Severity.ERROR

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        for idx, geom in enumerate(gdf.geometry):
            if geom is None or geom.is_empty:
                issues.append(
                    RuleIssue(
                        feature_index=idx,
                        issue_type="null_geometry",
                        message=f"NULL or empty geometry at index {idx}.",
                        severity=self.default_severity,
                        suggested_fix="Remove feature or assign a valid geometry.",
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
            message="No null geometries." if not issues else f"{len(issues)} null/empty geometries found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class GeometryTypeConsistencyRule(BaseRule):
    rule_id = "geometry_type_consistency"
    name = "Geometry Type Consistency"
    description = "Ensure a single geometry type per layer."
    category = RuleCategory.GEOMETRY
    default_severity = Severity.WARNING

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        types = {t for t in gdf.geometry.geom_type.unique() if t is not None}
        issues: list[RuleIssue] = []
        if len(types) > 1:
            issues.append(
                RuleIssue(
                    issue_type="mixed_geometry_types",
                    message=f"Mixed geometry types found: {types}.",
                    severity=self.default_severity,
                    suggested_fix="Split layer by geometry type or enforce a single type.",
                )
            )
        score = 100.0 if not issues else 80.0
        status = "passed" if not issues else "warning"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="Single geometry type." if not issues else f"Mixed types: {types}.",
            issue_count=len(issues),
            issues=issues,
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class DuplicateVerticesRule(BaseRule):
    rule_id = "duplicate_vertices"
    name = "Duplicate Vertices"
    description = "Detect consecutive duplicate points in geometries."
    category = RuleCategory.GEOMETRY
    default_severity = Severity.WARNING

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        for idx, geom in enumerate(gdf.geometry):
            if geom is None or geom.is_empty:
                continue
            geoms_to_check = []
            if geom.geom_type in ("Polygon", "MultiPolygon"):
                if geom.geom_type == "Polygon":
                    geoms_to_check.append(geom.exterior)
                    geoms_to_check.extend(list(geom.interiors))
                else:
                    for poly in geom.geoms:
                        geoms_to_check.append(poly.exterior)
                        geoms_to_check.extend(list(poly.interiors))
            elif hasattr(geom, "geoms"):
                geoms_to_check = list(geom.geoms)
            else:
                geoms_to_check = [geom]

            for part in geoms_to_check:
                part_coords = list(part.coords) if hasattr(part, "coords") else []
                for i in range(len(part_coords) - 1):
                    if part_coords[i] == part_coords[i + 1]:
                        issues.append(
                            RuleIssue(
                                feature_index=idx,
                                issue_type="duplicate_vertices",
                                message=f"Duplicate consecutive vertices at index {idx}.",
                                severity=self.default_severity,
                                suggested_fix="Remove redundant consecutive coordinates.",
                            )
                        )
                        if len(issues) >= _MAX_ISSUES:
                            break
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
            message="No duplicate vertices." if not issues else f"{len(issues)} duplicate vertices found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class BoundingBoxBoundsRule(BaseRule):
    rule_id = "bounding_box_bounds"
    name = "Bounding Box Bounds"
    description = "Check data lies within expected geographic extent."
    category = RuleCategory.GEOMETRY
    default_severity = Severity.WARNING
    default_params = {"minx": -180.0, "miny": -90.0, "maxx": 180.0, "maxy": 90.0}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        minx = self.params.get("minx", -180.0)
        miny = self.params.get("miny", -90.0)
        maxx = self.params.get("maxx", 180.0)
        maxy = self.params.get("maxy", 90.0)
        bounds = gdf.total_bounds
        if bounds[0] < minx or bounds[1] < miny or bounds[2] > maxx or bounds[3] > maxy:
            issues.append(
                RuleIssue(
                    issue_type="out_of_bounds",
                    message=f"Dataset bounds {bounds} exceed expected extent ({minx}, {miny}, {maxx}, {maxy}).",
                    severity=self.default_severity,
                    suggested_fix="Clip data to expected extent or verify CRS.",
                )
            )
        score = 100.0 if not issues else 70.0
        status = "passed" if not issues else "warning"
        elapsed = (time.perf_counter() - start) * 1000
        return RuleResult(
            rule_id=self.rule_id,
            name=self.name,
            category=self.category,
            severity=self.default_severity,
            status=status,
            score=score,
            message="Within bounds." if not issues else "Data exceeds expected bounds.",
            issue_count=len(issues),
            issues=issues,
            execution_time_ms=elapsed,
        )
