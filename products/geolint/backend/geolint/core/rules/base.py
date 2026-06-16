"""Rule engine foundation for GeoLint."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

import geopandas as gpd


class Severity(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class RuleCategory(Enum):
    CRS = "crs"
    GEOMETRY = "geometry"
    TOPOLOGY = "topology"
    ATTRIBUTES = "attributes"
    METADATA = "metadata"


@dataclass
class RuleIssue:
    feature_id: Optional[Any] = None
    feature_index: Optional[int] = None
    issue_type: str = ""
    message: str = ""
    severity: Severity = Severity.WARNING
    coordinates: Optional[tuple] = None
    suggested_fix: Optional[str] = None


@dataclass
class RuleResult:
    rule_id: str
    name: str
    category: RuleCategory
    severity: Severity
    status: str  # "passed", "failed", "warning"
    score: float  # 0-100
    message: str
    issue_count: int
    issues: list[RuleIssue] = field(default_factory=list)
    execution_time_ms: float = 0.0


class BaseRule(ABC):
    """Abstract base class for all GeoLint validation rules."""

    rule_id: str = ""
    name: str = ""
    description: str = ""
    category: RuleCategory = RuleCategory.GEOMETRY
    default_severity: Severity = Severity.ERROR
    default_params: dict[str, Any] = {}

    def __init__(self, params: Optional[dict[str, Any]] = None) -> None:
        self.params = {**self.default_params, **(params or {})}

    @abstractmethod
    def execute(self, gdf: gpd.GeoDataFrame, context: dict[str, Any]) -> RuleResult:
        """Execute the rule against a GeoDataFrame."""
        ...
