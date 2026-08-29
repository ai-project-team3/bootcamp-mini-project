from app.mafia.models.persona import PersonaScores

ROLES: tuple[str, ...] = ("mafia", "police", "doctor", "citizen")

# 어떤 성향이 어떤 직업에 어울리는지 (docs/페르소나-인계.md의 제안).
#
# 마피아는 판을 벌리되(DOM) 남을 덜 살피고(EMP 반대), 성급하지 않으며
# (SPD 반대) 말수가 적은 쪽(EXP 반대)이 어울린다 — 말이 많은 사람이 마피아면
# 티가 나기 때문이다.
_MAFIA_WEIGHTS = {"DOM": 0.30, "EMP_inverse": 0.25, "SPD_inverse": 0.20, "EXP_inverse": 0.25}
# 경찰은 남을 잘 맞히고(OBS) 서두르지 않는 쪽.
_POLICE_WEIGHTS = {"OBS": 0.60, "SPD_inverse": 0.40}
# 의사는 남을 살피고(EMP) 서두르지 않는 쪽.
_DOCTOR_WEIGHTS = {"EMP": 0.65, "SPD_inverse": 0.35}
_CITIZEN_BASELINE = 50.0


def compute_role_scores(persona: PersonaScores) -> dict[str, float]:
    return {
        "mafia": (
            _MAFIA_WEIGHTS["DOM"] * persona.DOM
            + _MAFIA_WEIGHTS["EMP_inverse"] * (100 - persona.EMP)
            + _MAFIA_WEIGHTS["SPD_inverse"] * (100 - persona.SPD)
            + _MAFIA_WEIGHTS["EXP_inverse"] * (100 - persona.EXP)
        ),
        "police": (
            _POLICE_WEIGHTS["OBS"] * persona.OBS
            + _POLICE_WEIGHTS["SPD_inverse"] * (100 - persona.SPD)
        ),
        "doctor": (
            _DOCTOR_WEIGHTS["EMP"] * persona.EMP
            + _DOCTOR_WEIGHTS["SPD_inverse"] * (100 - persona.SPD)
        ),
        "citizen": _CITIZEN_BASELINE,
    }
