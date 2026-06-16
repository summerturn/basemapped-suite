"""Rule registry with auto-discovery for GeoLint."""

from __future__ import annotations

from typing import Any, Callable, Optional, Type

from geolint.core.rules.base import BaseRule, RuleCategory, RuleResult


class RuleRegistry:
    """Central registry for validation rules."""

    _rules: dict[str, Type[BaseRule]] = {}
    _SETS: dict[str, list[str]] = {}

    @classmethod
    def register(cls, rule_class: Type[BaseRule]) -> Type[BaseRule]:
        """Decorator to auto-register a rule class."""
        if not rule_class.rule_id:
            raise ValueError(f"Rule class {rule_class.__name__} must define a rule_id")
        cls._rules[rule_class.rule_id] = rule_class
        return rule_class

    @classmethod
    def get(cls, rule_id: str) -> Type[BaseRule]:
        """Retrieve a registered rule class by ID."""
        if rule_id not in cls._rules:
            raise KeyError(f"Rule '{rule_id}' is not registered")
        return cls._rules[rule_id]

    @classmethod
    def list_rules(cls) -> list[str]:
        """List all registered rule IDs."""
        return list(cls._rules.keys())

    @classmethod
    def list_by_category(cls, category: RuleCategory | str) -> list[str]:
        """List rule IDs filtered by category."""
        cat_value = category.value if isinstance(category, RuleCategory) else category
        return [
            rid
            for rid, rclass in cls._rules.items()
            if rclass.category.value == cat_value
        ]

    @classmethod
    def build_set(cls, name: str, rule_ids: list[str]) -> None:
        """Register a named set of rule IDs."""
        cls._SETS[name] = rule_ids

    @classmethod
    def get_set(cls, name: str) -> list[Type[BaseRule]]:
        """Return rule classes for a named set."""
        if name not in cls._SETS:
            raise KeyError(f"Rule set '{name}' is not defined")
        return [cls._rules[rid] for rid in cls._SETS[name] if rid in cls._rules]

    @classmethod
    def instantiate_set(
        cls, name: str, overrides: Optional[dict[str, dict[str, Any]]] = None
    ) -> list[BaseRule]:
        """Instantiate rules from a named set with optional param overrides."""
        overrides = overrides or {}
        return [
            rule_cls(params=overrides.get(rule_cls.rule_id))
            for rule_cls in cls.get_set(name)
        ]


# Minimal set (8 rules)
RuleRegistry.build_set(
    "minimal",
    [
        "crs_defined",
        "geometry_validity",
        "null_geometry",
        "duplicate_features",
        "attribute_completeness",
        "unique_id_check",
        "metadata_present",
        "geometry_type_consistency",
    ],
)

# Standard set (16 rules)
RuleRegistry.build_set(
    "standard",
    [
        "crs_defined",
        "crs_consistency",
        "geometry_validity",
        "self_intersection",
        "null_geometry",
        "geometry_type_consistency",
        "duplicate_vertices",
        "duplicate_features",
        "overlapping_polygons",
        "attribute_completeness",
        "attribute_type_check",
        "attribute_range_check",
        "unique_id_check",
        "enum_value_check",
        "metadata_present",
        "bounding_box_bounds",
    ],
)

# Strict set (all 24 rules)
RuleRegistry.build_set(
    "strict",
    [
        "crs_defined",
        "crs_consistency",
        "geometry_validity",
        "self_intersection",
        "null_geometry",
        "geometry_type_consistency",
        "duplicate_vertices",
        "bounding_box_bounds",
        "duplicate_features",
        "overlapping_polygons",
        "gap_detection",
        "dangling_nodes",
        "intersecting_lines",
        "closed_loop",
        "attribute_completeness",
        "attribute_type_check",
        "attribute_range_check",
        "unique_id_check",
        "enum_value_check",
        "date_format_check",
        "metadata_present",
        "iso_19115_compliance",
    ],
)
