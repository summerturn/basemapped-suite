"""Rules API routes."""

from typing import List

from fastapi import APIRouter

from geolint.schemas import RuleInfo, RuleSetInfo

router = APIRouter()


# In-memory rule registry; in production this could be loaded from DB or config
RULES: List[RuleInfo] = [
    RuleInfo(id="topology", name="Topology Validation", description="Checks for invalid geometries, self-intersections, and rings.", category="geometry"),
    RuleInfo(id="crs", name="CRS Consistency", description="Validates CRS definitions and consistency across layers.", category="metadata"),
    RuleInfo(id="attribute", name="Attribute Completeness", description="Ensures required attributes are present and valid.", category="attributes"),
    RuleInfo(id="bbox", name="Bounding Box Check", description="Validates bounding boxes are within expected extents.", category="geometry"),
    RuleInfo(id="projection", name="Projection Accuracy", description="Checks for projection distortions and accuracy.", category="metadata"),
    RuleInfo(id="duplicate", name="Duplicate Detection", description="Detects duplicate or near-duplicate features.", category="data_quality"),
    RuleInfo(id="nulls", name="Null Value Check", description="Identifies unexpected null or empty values.", category="data_quality"),
    RuleInfo(id="format", name="Format Compliance", description="Validates file format specification compliance.", category="metadata"),
]

RULE_SETS: List[RuleSetInfo] = [
    RuleSetInfo(id="standard", name="Standard", description="Recommended rules for most datasets.", rules=["topology", "crs", "attribute", "bbox", "nulls"]),
    RuleSetInfo(id="strict", name="Strict", description="All available rules enabled.", rules=[r.id for r in RULES]),
    RuleSetInfo(id="minimal", name="Minimal", description="Basic geometry and format checks only.", rules=["topology", "format"]),
]


@router.get("/rules", response_model=List[RuleInfo])
async def list_rules():
    """List all available validation rules."""
    return RULES


@router.get("/rules/{rule_id}", response_model=RuleInfo)
async def get_rule(rule_id: str):
    """Get a single rule by ID."""
    for rule in RULES:
        if rule.id == rule_id:
            return rule
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Rule not found")


@router.get("/rules/sets", response_model=List[RuleSetInfo])
async def list_rule_sets():
    """List all predefined rule sets."""
    return RULE_SETS
