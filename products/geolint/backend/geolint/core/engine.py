"""Validation orchestrator for GeoLint."""

from __future__ import annotations

import concurrent.futures
import time
import traceback
from typing import Any, Callable, Generator, Optional

import geopandas as gpd

from geolint.core.ingest.loader import IngestionResult, load_file
from geolint.core.rules.base import BaseRule, RuleResult
from geolint.core.rules.registry import RuleRegistry
from geolint.core.scoring import QualityScoreCalculator


class ValidationOrchestrator:
    """Orchestrate the full validation pipeline."""

    def __init__(
        self,
        max_workers: Optional[int] = None,
    ) -> None:
        self.max_workers = max_workers

    def orchestrate(
        self,
        dataset: str | IngestionResult,
        rule_configs: list[dict[str, Any]],
        context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Run the full validation pipeline."""
        ctx = context or {}
        if isinstance(dataset, str):
            ingestion = load_file(dataset)
        else:
            ingestion = dataset

        gdf = ingestion.geodataframe
        ctx["ingestion"] = ingestion
        ctx["metadata"] = ctx.get("metadata", {})

        rules: list[BaseRule] = []
        for cfg in rule_configs:
            rule_id = cfg["rule_id"]
            params = cfg.get("params")
            rule_cls = RuleRegistry.get(rule_id)
            rules.append(rule_cls(params=params))

        results = self.run_parallel_rules(gdf, rules, ctx)
        score_data = QualityScoreCalculator.calculate_overall_score(results)

        return {
            "ingestion": ingestion,
            "rule_results": results,
            "score": score_data,
            "context": ctx,
        }

    def run_parallel_rules(
        self,
        gdf: gpd.GeoDataFrame,
        rules: list[BaseRule],
        context: dict[str, Any],
    ) -> list[RuleResult]:
        """Execute rules in parallel using ThreadPoolExecutor."""
        results: list[RuleResult] = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_rule = {
                executor.submit(self._safe_execute, rule, gdf, context): rule for rule in rules
            }
            for future in concurrent.futures.as_completed(future_to_rule):
                result = future.result()
                results.append(result)
        return results

    def _safe_execute(
        self, rule: BaseRule, gdf: gpd.GeoDataFrame, context: dict[str, Any]
    ) -> RuleResult:
        try:
            return rule.execute(gdf, context)
        except Exception as exc:
            return RuleResult(
                rule_id=rule.rule_id,
                name=rule.name,
                category=rule.category,
                severity=rule.default_severity,
                status="failed",
                score=0.0,
                message=f"Rule crashed: {exc}",
                issue_count=1,
                issues=[],
                execution_time_ms=0.0,
            )

    def with_progress_callback(
        self,
        dataset: str | IngestionResult,
        rule_configs: list[dict[str, Any]],
        context: Optional[dict[str, Any]] = None,
    ) -> Generator[dict[str, Any], None, dict[str, Any]]:
        """Yield progress updates and return final result."""
        ctx = context or {}
        if isinstance(dataset, str):
            ingestion = load_file(dataset)
        else:
            ingestion = dataset
        gdf = ingestion.geodataframe
        ctx["ingestion"] = ingestion
        ctx["metadata"] = ctx.get("metadata", {})

        rules: list[BaseRule] = []
        for cfg in rule_configs:
            rule_id = cfg["rule_id"]
            params = cfg.get("params")
            rule_cls = RuleRegistry.get(rule_id)
            rules.append(rule_cls(params=params))

        total = len(rules)
        results: list[RuleResult] = []
        issues_found = 0

        for i, rule in enumerate(rules):
            result = self._safe_execute(rule, gdf, ctx)
            results.append(result)
            issues_found += result.issue_count
            percent = int((i + 1) / total * 100)
            yield {
                "percent": percent,
                "current_rule": rule.rule_id,
                "issues_found": issues_found,
            }

        score_data = QualityScoreCalculator.calculate_overall_score(results)
        final = {
            "ingestion": ingestion,
            "rule_results": results,
            "score": score_data,
            "context": ctx,
        }
        return final
