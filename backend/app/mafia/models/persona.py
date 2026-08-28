from pydantic import BaseModel, field_validator

PERSONA_AXES: tuple[str, ...] = ("initiative", "analysis", "empathy", "caution")
NEUTRAL_SCORE = 50


class PersonaScores(BaseModel):
    initiative: int
    analysis: int
    empathy: int
    caution: int

    @field_validator("initiative", "analysis", "empathy", "caution")
    @classmethod
    def clamp_to_valid_range(cls, value: int) -> int:
        return max(0, min(100, value))

    @classmethod
    def from_partial(cls, data: dict[str, int]) -> "PersonaScores":
        filled = {axis: data.get(axis, NEUTRAL_SCORE) for axis in PERSONA_AXES}
        return cls(**filled)
