"""Quality scoring calculator for GeoLint validation results."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from geolint.core.rules.base import RuleCategory, RuleResult, Severity


@dataclass
class ScoreBreakdown:
    overall_score: float
    grade: str
    categories: dict[str, dict[str, Any]]
    passes_threshold: bool
    status: str


class QualityScoreCalculator:
    """Calculate overall and per-category quality scores."""

    CATEGORY_WEIGHTS: dict[RuleCategory, float] = {
        RuleCategory.CRS: 0.15,
        RuleCategory.GEOMETRY: 0.30,
        RuleCategory.TOPOLOGY: 0.20,
        RuleCategory.ATTRIBUTES: 0.20,
        RuleCategory.METADATA: 0.15,
    }

    SEVERITY_WEIGHTS: dict[Severity, float] = {
        Severity.ERROR: 1.0,
        Severity.WARNING: 0.3,
        Severity.INFO: 0.0,
    }

    @classmethod
    def calculate_overall_score(cls, rule_results: list[RuleResult]) -> dict[str, Any]:
        """Calculate overall quality score from a list of rule results."""
        if not rule_results:
            return {
                "overall_score": 100.0,
                "grade": "A+",
                "categories": {},
                "passes_threshold": True,
                "status": "passed",
            }

        category_scores: dict[RuleCategory, list[float]] = {
            cat: [] for cat in RuleCategory
        }
        category_issues: dict[RuleCategory, int] = {cat: 0 for cat in RuleCategory}
        category_weighted_issues: dict[RuleCategory, float] = {cat: 0.0 for cat in RuleCategory}

        for result in rule_results:
            cat = result.category
            category_scores[cat].append(result.score)
            category_issues[cat] += result.issue_count
            weighted = sum(
                cls.SEVERITY_WEIGHTS.get(issue.severity, 0.0) for issue in result.issues
            )
            category_weighted_issues[cat] += weighted

        category_breakdown: dict[str, dict[str, Any]] = {}
        weighted_sum = 0.0
        total_weight = 0.0

        for cat in RuleCategory:
            scores = category_scores[cat]
            if scores:
                avg_score = sum(scores) / len(scores)
            else:
                avg_score = 100.0

            weight = cls.CATEGORY_WEIGHTS[cat]
            weighted_sum += avg_score * weight
            total_weight += weight

            category_breakdown[cat.value] = {
                "score": round(avg_score, 2),
                "issue_count": category_issues[cat],
                "weighted_issue_score": round(category_weighted_issues[cat], 2),
                "weight": weight,
            }

        overall_score = weighted_sum / total_weight if total_weight > 0 else 100.0
        overall_score = max(0.0, min(100.0, overall_score))
        grade = cls._score_to_grade(overall_score)
        status = "passed" if overall_score >= 90 else "warning" if overall_score >= 70 else "failed"

        return {
            "overall_score": round(overall_score, 2),
            "grade": grade,
            "categories": category_breakdown,
            "passes_threshold": overall_score >= 70,
            "status": status,
        }

    @classmethod
    def _score_to_grade(cls, score: float) -> str:
        if score >= 97:
            return "A+"
        if score >= 90:
            return "A"
        if score >= 87:
            return "B+"
        if score >= 80:
            return "B"
        if score >= 77:
            return "C+"
        if score >= 70:
            return "C"
        if score >= 60:
            return "D"
        return "F"
