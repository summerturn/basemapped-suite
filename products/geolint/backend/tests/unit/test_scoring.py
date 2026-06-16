"""Unit tests for GeoLint scoring algorithm."""

from __future__ import annotations

import pytest

from geolint.core.rules.base import RuleCategory, RuleIssue, RuleResult, Severity
from geolint.core.scoring import QualityScoreCalculator


class TestQualityScoreCalculator:
    def test_empty_results(self) -> None:
        score = QualityScoreCalculator.calculate_overall_score([])
        assert score["overall_score"] == 100.0
        assert score["grade"] == "A+"
        assert score["status"] == "passed"
        assert score["passes_threshold"] is True

    def test_perfect_score(self) -> None:
        results = [
            RuleResult(
                rule_id="r1", name="R1", category=RuleCategory.GEOMETRY,
                severity=Severity.ERROR, status="passed", score=100.0,
                message="ok", issue_count=0,
            ),
            RuleResult(
                rule_id="r2", name="R2", category=RuleCategory.CRS,
                severity=Severity.ERROR, status="passed", score=100.0,
                message="ok", issue_count=0,
            ),
        ]
        score = QualityScoreCalculator.calculate_overall_score(results)
        assert score["overall_score"] == 100.0
        assert score["grade"] == "A+"
        assert score["status"] == "passed"

    def test_category_weighting(self) -> None:
        # Geometry (weight 0.30) fails, CRS (weight 0.15) passes; empty categories get 100
        results = [
            RuleResult(
                rule_id="r1", name="R1", category=RuleCategory.GEOMETRY,
                severity=Severity.ERROR, status="failed", score=0.0,
                message="bad", issue_count=10,
            ),
            RuleResult(
                rule_id="r2", name="R2", category=RuleCategory.CRS,
                severity=Severity.ERROR, status="passed", score=100.0,
                message="ok", issue_count=0,
            ),
        ]
        score = QualityScoreCalculator.calculate_overall_score(results)
        # Empty categories default to 100, so overall is pulled up significantly
        assert score["overall_score"] == 70.0
        assert score["status"] == "warning"
        assert score["grade"] == "C"

    def test_grade_boundaries(self) -> None:
        assert QualityScoreCalculator._score_to_grade(100.0) == "A+"
        assert QualityScoreCalculator._score_to_grade(97.0) == "A+"
        assert QualityScoreCalculator._score_to_grade(96.0) == "A"
        assert QualityScoreCalculator._score_to_grade(90.0) == "A"
        assert QualityScoreCalculator._score_to_grade(89.0) == "B+"
        assert QualityScoreCalculator._score_to_grade(87.0) == "B+"
        assert QualityScoreCalculator._score_to_grade(86.0) == "B"
        assert QualityScoreCalculator._score_to_grade(80.0) == "B"
        assert QualityScoreCalculator._score_to_grade(79.0) == "C+"
        assert QualityScoreCalculator._score_to_grade(77.0) == "C+"
        assert QualityScoreCalculator._score_to_grade(76.0) == "C"
        assert QualityScoreCalculator._score_to_grade(70.0) == "C"
        assert QualityScoreCalculator._score_to_grade(69.0) == "D"
        assert QualityScoreCalculator._score_to_grade(60.0) == "D"
        assert QualityScoreCalculator._score_to_grade(59.0) == "F"

    def test_status_thresholds(self) -> None:
        def make_result(score: float, cat: RuleCategory) -> RuleResult:
            return RuleResult(
                rule_id="r", name="R", category=cat,
                severity=Severity.ERROR, status="passed" if score >= 90 else "warning" if score >= 70 else "failed",
                score=score, message="", issue_count=0,
            )

        # Provide rules in every category so overall score reflects input directly
        results = [
            make_result(95.0, RuleCategory.CRS),
            make_result(95.0, RuleCategory.GEOMETRY),
            make_result(95.0, RuleCategory.TOPOLOGY),
            make_result(95.0, RuleCategory.ATTRIBUTES),
            make_result(95.0, RuleCategory.METADATA),
        ]
        assert QualityScoreCalculator.calculate_overall_score(results)["status"] == "passed"

        results = [
            make_result(75.0, RuleCategory.CRS),
            make_result(75.0, RuleCategory.GEOMETRY),
            make_result(75.0, RuleCategory.TOPOLOGY),
            make_result(75.0, RuleCategory.ATTRIBUTES),
            make_result(75.0, RuleCategory.METADATA),
        ]
        assert QualityScoreCalculator.calculate_overall_score(results)["status"] == "warning"

        results = [
            make_result(50.0, RuleCategory.CRS),
            make_result(50.0, RuleCategory.GEOMETRY),
            make_result(50.0, RuleCategory.TOPOLOGY),
            make_result(50.0, RuleCategory.ATTRIBUTES),
            make_result(50.0, RuleCategory.METADATA),
        ]
        assert QualityScoreCalculator.calculate_overall_score(results)["status"] == "failed"

    def test_severity_weights_affect_category(self) -> None:
        # Two rules in same category: one with error issues, one with warnings
        results = [
            RuleResult(
                rule_id="r1", name="R1", category=RuleCategory.ATTRIBUTES,
                severity=Severity.ERROR, status="failed", score=50.0,
                message="errors", issue_count=2,
                issues=[
                    RuleIssue(issue_type="e1", severity=Severity.ERROR),
                    RuleIssue(issue_type="e2", severity=Severity.ERROR),
                ],
            ),
            RuleResult(
                rule_id="r2", name="R2", category=RuleCategory.ATTRIBUTES,
                severity=Severity.WARNING, status="warning", score=90.0,
                message="warnings", issue_count=3,
                issues=[
                    RuleIssue(issue_type="w1", severity=Severity.WARNING),
                    RuleIssue(issue_type="w2", severity=Severity.WARNING),
                    RuleIssue(issue_type="w3", severity=Severity.WARNING),
                ],
            ),
        ]
        score = QualityScoreCalculator.calculate_overall_score(results)
        # Category score is average of rule scores: (50 + 90) / 2 = 70
        assert score["categories"]["attributes"]["score"] == 70.0
        # Weighted issue score should reflect severity weights: errors=1.0 each, warnings=0.3 each => 2*1.0 + 3*0.3 = 2.9
        assert score["categories"]["attributes"]["weighted_issue_score"] == 2.9

    def test_all_categories_present(self) -> None:
        results = [
            RuleResult(
                rule_id=f"r_{cat.value}", name=f"R{cat.value}", category=cat,
                severity=Severity.INFO, status="passed", score=100.0,
                message="ok", issue_count=0,
            )
            for cat in RuleCategory
        ]
        score = QualityScoreCalculator.calculate_overall_score(results)
        for cat in RuleCategory:
            assert cat.value in score["categories"]
            assert score["categories"][cat.value]["score"] == 100.0
