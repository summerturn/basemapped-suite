"""Topology validation rules using spatial indexing."""

from __future__ import annotations

import time
from typing import Any

import geopandas as gpd
import numpy as np
from rtree import index
from shapely.geometry import LineString, MultiLineString, Point, Polygon
from shapely.ops import unary_union

from geolint.core.rules.base import BaseRule, RuleCategory, RuleIssue, RuleResult, Severity
from geolint.core.rules.registry import RuleRegistry

_MAX_ISSUES = 100


def _cap_issues(issues: list[RuleIssue]) -> list[RuleIssue]:
    return issues[:_MAX_ISSUES]


def _build_spatial_index(gdf: gpd.GeoDataFrame) -> index.Index:
    """Build an R-tree spatial index for the GeoDataFrame."""
    idx = index.Index()
    for i, geom in enumerate(gdf.geometry):
        if geom is not None and not geom.is_empty:
            idx.insert(i, geom.bounds)
    return idx


@RuleRegistry.register
class DuplicateFeaturesRule(BaseRule):
    rule_id = "duplicate_features"
    name = "Duplicate Features"
    description = "Detect identical geometries within tolerance."
    category = RuleCategory.TOPOLOGY
    default_severity = Severity.ERROR
    default_params = {"tolerance": 1e-9}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        tolerance = self.params.get("tolerance", 1e-9)
        n = len(gdf)
        for i in range(n):
            gi = gdf.geometry.iloc[i]
            if gi is None or gi.is_empty:
                continue
            for j in range(i + 1, n):
                gj = gdf.geometry.iloc[j]
                if gj is None or gj.is_empty:
                    continue
                if gi.equals_exact(gj, tolerance) if tolerance > 0 else gi.equals(gj):
                    issues.append(
                        RuleIssue(
                            feature_index=i,
                            issue_type="duplicate_feature",
                            message=f"Feature {i} is a duplicate of feature {j}.",
                            severity=self.default_severity,
                            suggested_fix="Remove duplicate feature.",
                        )
                    )
                    if len(issues) >= _MAX_ISSUES:
                        break
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
            message="No duplicate features." if not issues else f"{len(issues)} duplicates found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class OverlappingPolygonsRule(BaseRule):
    rule_id = "overlapping_polygons"
    name = "Overlapping Polygons"
    description = "Detect polygon-polygon overlaps using spatial index."
    category = RuleCategory.TOPOLOGY
    default_severity = Severity.ERROR
    default_params = {"min_overlap_area": 1e-9}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        min_area = self.params.get("min_overlap_area", 1e-9)
        spatial_idx = _build_spatial_index(gdf)
        n = len(gdf)
        checked = set()
        for i in range(n):
            gi = gdf.geometry.iloc[i]
            if gi is None or gi.is_empty or "Polygon" not in gi.geom_type:
                continue
            for j in spatial_idx.intersection(gi.bounds):
                if i == j or (i, j) in checked or (j, i) in checked:
                    continue
                checked.add((i, j))
                gj = gdf.geometry.iloc[j]
                if gj is None or gj.is_empty or "Polygon" not in gj.geom_type:
                    continue
                if gi.intersects(gj):
                    inter = gi.intersection(gj)
                    if inter.area > min_area:
                        issues.append(
                            RuleIssue(
                                feature_index=i,
                                issue_type="overlapping_polygon",
                                message=f"Polygon {i} overlaps polygon {j} (area {inter.area:.6f}).",
                                severity=self.default_severity,
                                suggested_fix="Resolve overlap by editing boundaries.",
                            )
                        )
                        if len(issues) >= _MAX_ISSUES:
                            break
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
            message="No overlapping polygons." if not issues else f"{len(issues)} overlaps found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class GapDetectionRule(BaseRule):
    rule_id = "gap_detection"
    name = "Gap Detection"
    description = "Detect coverage gaps between adjacent polygons."
    category = RuleCategory.TOPOLOGY
    default_severity = Severity.WARNING
    default_params = {"min_gap_area": 1e-9}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        polys = [g for g in gdf.geometry if g is not None and "Polygon" in g.geom_type]
        if len(polys) < 2:
            elapsed = (time.perf_counter() - start) * 1000
            return RuleResult(
                rule_id=self.rule_id,
                name=self.name,
                category=self.category,
                severity=self.default_severity,
                status="passed",
                score=100.0,
                message="Not enough polygons to check for gaps.",
                issue_count=0,
                issues=[],
                execution_time_ms=elapsed,
            )
        union = unary_union(polys)
        if union.geom_type == "MultiPolygon":
            min_gap_area = self.params.get("min_gap_area", 1e-9)
            for part in union.geoms:
                if part.area < min_gap_area:
                    continue
                if all(not p.equals(part) for p in polys):
                    issues.append(
                        RuleIssue(
                            issue_type="gap",
                            message=f"Gap detected with area {part.area:.6f}.",
                            severity=self.default_severity,
                            suggested_fix="Fill coverage gap between adjacent polygons.",
                        )
                    )
                    if len(issues) >= _MAX_ISSUES:
                        break
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
            message="No gaps detected." if not issues else f"{len(issues)} gaps detected.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class DanglingNodesRule(BaseRule):
    rule_id = "dangling_nodes"
    name = "Dangling Nodes"
    description = "Detect line endpoints not connecting to another line."
    category = RuleCategory.TOPOLOGY
    default_severity = Severity.WARNING
    default_params = {"tolerance": 1e-9}

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        tolerance = self.params.get("tolerance", 1e-9)
        lines = [g for g in gdf.geometry if g is not None and "Line" in g.geom_type]
        if not lines:
            elapsed = (time.perf_counter() - start) * 1000
            return RuleResult(
                rule_id=self.rule_id,
                name=self.name,
                category=self.category,
                severity=self.default_severity,
                status="passed",
                score=100.0,
                message="No line geometries to check.",
                issue_count=0,
                issues=[],
                execution_time_ms=elapsed,
            )
        endpoints = []
        for line in lines:
            if line.geom_type == "MultiLineString":
                for seg in line.geoms:
                    endpoints.append(Point(seg.coords[0]))
                    endpoints.append(Point(seg.coords[-1]))
            else:
                endpoints.append(Point(line.coords[0]))
                endpoints.append(Point(line.coords[-1]))
        # Count occurrences within tolerance via brute force (small sets) or spatial index
        idx = index.Index()
        for i, pt in enumerate(endpoints):
            idx.insert(i, pt.bounds)
        visited = set()
        for i, pt in enumerate(endpoints):
            if i in visited:
                continue
            neighbors = list(idx.intersection(pt.buffer(tolerance).bounds))
            connected = False
            for j in neighbors:
                if i == j:
                    continue
                if pt.distance(endpoints[j]) <= tolerance:
                    connected = True
                    visited.add(j)
            if not connected:
                issues.append(
                    RuleIssue(
                        issue_type="dangling_node",
                        message=f"Dangling node at ({pt.x:.6f}, {pt.y:.6f}).",
                        severity=self.default_severity,
                        coordinates=(pt.x, pt.y),
                        suggested_fix="Connect dangling endpoint to nearby line or snap.",
                    )
                )
                if len(issues) >= _MAX_ISSUES:
                    break
            visited.add(i)
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
            message="No dangling nodes." if not issues else f"{len(issues)} dangling nodes found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class IntersectingLinesRule(BaseRule):
    rule_id = "intersecting_lines"
    name = "Intersecting Lines"
    description = "Detect line intersections excluding shared endpoints."
    category = RuleCategory.TOPOLOGY
    default_severity = Severity.ERROR

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        spatial_idx = _build_spatial_index(gdf)
        n = len(gdf)
        checked = set()
        for i in range(n):
            gi = gdf.geometry.iloc[i]
            if gi is None or gi.is_empty or "Line" not in gi.geom_type:
                continue
            for j in spatial_idx.intersection(gi.bounds):
                if i >= j or (i, j) in checked:
                    continue
                checked.add((i, j))
                gj = gdf.geometry.iloc[j]
                if gj is None or gj.is_empty or "Line" not in gj.geom_type:
                    continue
                if gi.intersects(gj):
                    inter = gi.intersection(gj)
                    # Exclude shared endpoints (Point intersections at endpoints)
                    if inter.geom_type == "Point":
                        if gi.touches(gj):
                            continue
                    issues.append(
                        RuleIssue(
                            feature_index=i,
                            issue_type="intersecting_lines",
                            message=f"Line {i} intersects line {j}.",
                            severity=self.default_severity,
                            suggested_fix="Move or split lines at intersection.",
                        )
                    )
                    if len(issues) >= _MAX_ISSUES:
                        break
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
            message="No intersecting lines." if not issues else f"{len(issues)} intersecting lines found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )


@RuleRegistry.register
class ClosedLoopRule(BaseRule):
    rule_id = "closed_loop"
    name = "Closed Loop"
    description = "Verify polygon rings are properly closed."
    category = RuleCategory.TOPOLOGY
    default_severity = Severity.ERROR

    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        start = time.perf_counter()
        issues: list[RuleIssue] = []
        for idx, geom in enumerate(gdf.geometry):
            if geom is None or geom.is_empty:
                continue
            if geom.geom_type == "Polygon":
                for ring in [geom.exterior] + list(geom.interiors):
                    coords = list(ring.coords)
                    if len(coords) < 2 or coords[0] != coords[-1]:
                        issues.append(
                            RuleIssue(
                                feature_index=idx,
                                issue_type="open_ring",
                                message=f"Polygon ring not closed at index {idx}.",
                                severity=self.default_severity,
                                suggested_fix="Ensure first and last coordinates are identical.",
                            )
                        )
                        if len(issues) >= _MAX_ISSUES:
                            break
            elif geom.geom_type == "MultiPolygon":
                for poly in geom.geoms:
                    for ring in [poly.exterior] + list(poly.interiors):
                        coords = list(ring.coords)
                        if len(coords) < 2 or coords[0] != coords[-1]:
                            issues.append(
                                RuleIssue(
                                    feature_index=idx,
                                    issue_type="open_ring",
                                    message=f"Polygon ring not closed at index {idx}.",
                                    severity=self.default_severity,
                                    suggested_fix="Ensure first and last coordinates are identical.",
                                )
                            )
                            if len(issues) >= _MAX_ISSUES:
                                break
                    if len(issues) >= _MAX_ISSUES:
                        break
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
            message="All polygon rings are closed." if not issues else f"{len(issues)} open rings found.",
            issue_count=len(issues),
            issues=_cap_issues(issues),
            execution_time_ms=elapsed,
        )
