from pydantic import BaseModel, field_validator

#: The five abilities the icebreaking run produces, under its own names.
#:
#: Taking its vocabulary is deliberate (docs/페르소나-인계.md): the run computes
#: the abilities, so it owns the schema and the games map from it rather than
#: everyone translating in both directions. `GET /rooms/{code}/persona` can be
#: POSTed to this game unchanged as a result.
PERSONA_AXES: tuple[str, ...] = ("DOM", "SPD", "EXP", "EMP", "OBS")

#: What an axis is worth when nobody supplied it — someone who never played the
#: icebreaking run is neither strong nor weak at anything.
NEUTRAL_SCORE = 50


class PersonaScores(BaseModel):
    """0~100 per axis. 주도력 · 순발력 · 표현력 · 공감력 · 관찰력."""

    DOM: int
    SPD: int
    EXP: int
    EMP: int
    OBS: int

    @field_validator("DOM", "SPD", "EXP", "EMP", "OBS")
    @classmethod
    def clamp_to_valid_range(cls, value: int) -> int:
        return max(0, min(100, value))

    @classmethod
    def from_partial(cls, data: dict[str, int]) -> "PersonaScores":
        """Fill in whatever the caller left out, so a partial handoff still works."""
        filled = {axis: data.get(axis, NEUTRAL_SCORE) for axis in PERSONA_AXES}
        return cls(**filled)
