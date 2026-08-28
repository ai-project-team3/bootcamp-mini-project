from app.mafia.models.persona import PersonaScores

ROLES: tuple[str, ...] = ("mafia", "police", "doctor", "citizen")

_MAFIA_WEIGHTS = {"initiative": 0.40, "empathy_inverse": 0.35, "caution": 0.25}
_POLICE_WEIGHTS = {"analysis": 0.60, "caution": 0.40}
_DOCTOR_WEIGHTS = {"empathy": 0.65, "caution": 0.35}
_CITIZEN_BASELINE = 50.0


def compute_role_scores(persona: PersonaScores) -> dict[str, float]:
    return {
        "mafia": (
            _MAFIA_WEIGHTS["initiative"] * persona.initiative
            + _MAFIA_WEIGHTS["empathy_inverse"] * (100 - persona.empathy)
            + _MAFIA_WEIGHTS["caution"] * persona.caution
        ),
        "police": (
            _POLICE_WEIGHTS["analysis"] * persona.analysis
            + _POLICE_WEIGHTS["caution"] * persona.caution
        ),
        "doctor": (
            _DOCTOR_WEIGHTS["empathy"] * persona.empathy
            + _DOCTOR_WEIGHTS["caution"] * persona.caution
        ),
        "citizen": _CITIZEN_BASELINE,
    }
