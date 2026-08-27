"""SELF axis scoring from survey answers. Plan doc §9-2.

    raw          = sum of the chosen values for that axis      range -2 .. +2
    SELF(axis)   = (raw + 2) / 4 * 5                           range 0 .. 5

An axis is flagged `low_confidence` when its two items point in opposite
directions strongly enough that the sum tells us nothing. In that case the axis
is pinned to the midpoint rather than reported as a real reading.
"""

from dataclasses import dataclass

from ..data.survey_items import item_index

MIDPOINT = 2.5

# Two items disagree "strongly" when both are past this magnitude in opposite
# directions. Ordered-four items sitting at ±1/3 are mild, so they do not trip it.
_CONFLICT_MAGNITUDE = 0.6


@dataclass
class AxisResult:
    axis_id: str
    value: float
    low_confidence: bool


def score_self(category: str, answers: dict[str, str]) -> list[AxisResult]:
    """answers maps item_id -> chosen key ("A"/"B"/"C"/"D")."""
    index = item_index(category)
    per_axis: dict[str, list[float]] = {}

    for item_id, choice_key in answers.items():
        item = index.get(item_id)
        if item is None:
            continue
        value = _value_of(item, choice_key)
        if value is None:
            continue
        per_axis.setdefault(item["axis"], []).append(value)

    results: list[AxisResult] = []
    for axis_id, values in per_axis.items():
        if _conflicting(values):
            results.append(AxisResult(axis_id, MIDPOINT, True))
            continue
        raw = sum(values)
        value = (raw + 2.0) / 4.0 * 5.0
        results.append(AxisResult(axis_id, _clamp(value), False))
    return results


def _value_of(item: dict, choice_key: str) -> float | None:
    for choice in item["choices"]:
        if choice["key"] == choice_key:
            return float(choice["value"])
    return None


def _conflicting(values: list[float]) -> bool:
    strong_positive = any(v >= _CONFLICT_MAGNITUDE for v in values)
    strong_negative = any(v <= -_CONFLICT_MAGNITUDE for v in values)
    return strong_positive and strong_negative


def _clamp(value: float) -> float:
    return max(0.0, min(5.0, value))
