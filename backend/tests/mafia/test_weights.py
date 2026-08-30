import pytest

from app.mafia.models.persona import PersonaScores
from app.mafia.roles.weights import compute_role_scores, ROLES


def test_roles_are_the_four_spec_roles():
    assert set(ROLES) == {"mafia", "police", "doctor", "citizen"}


def test_the_mafia_score_reads_four_abilities_the_way_the_handoff_doc_sets_out():
    # DOM 0.30 + (100-EMP) 0.25 + (100-SPD) 0.20 + (100-EXP) 0.25
    p = PersonaScores(DOM=82, SPD=55, EXP=30, EMP=40, OBS=65)

    expected = 0.30 * 82 + 0.25 * 60 + 0.20 * 45 + 0.25 * 70
    assert compute_role_scores(p)["mafia"] == pytest.approx(expected)


def test_the_police_score_is_observation_and_not_rushing():
    p = PersonaScores(DOM=35, SPD=70, EXP=50, EMP=58, OBS=90)

    assert compute_role_scores(p)["police"] == pytest.approx(0.60 * 90 + 0.40 * 30)


def test_the_doctor_score_is_empathy_and_not_rushing():
    p = PersonaScores(DOM=35, SPD=70, EXP=50, EMP=58, OBS=90)

    assert compute_role_scores(p)["doctor"] == pytest.approx(0.65 * 58 + 0.35 * 30)


def test_a_quiet_person_scores_higher_as_mafia_than_a_talkative_one():
    """말이 많은 사람이 마피아면 티가 난다 — 인계 문서의 EXP 도입 이유."""
    quiet = PersonaScores(DOM=60, SPD=50, EXP=10, EMP=50, OBS=50)
    talkative = PersonaScores(DOM=60, SPD=50, EXP=90, EMP=50, OBS=50)

    assert compute_role_scores(quiet)["mafia"] > compute_role_scores(talkative)["mafia"]


def test_citizen_score_is_always_the_fixed_baseline():
    high = PersonaScores.from_partial({axis: 100 for axis in ("DOM", "SPD", "EXP", "EMP", "OBS")})
    low = PersonaScores.from_partial({axis: 0 for axis in ("DOM", "SPD", "EXP", "EMP", "OBS")})

    assert compute_role_scores(high)["citizen"] == 50.0
    assert compute_role_scores(low)["citizen"] == 50.0
