import pytest

from app.mafia.models.persona import PersonaScores
from app.mafia.roles.weights import compute_role_scores, ROLES


def test_roles_are_the_four_spec_roles():
    assert set(ROLES) == {"mafia", "police", "doctor", "citizen"}


def test_compute_role_scores_matches_spec_example_player_p01():
    # spec §2.2 p_01: initiative=82, analysis=65, empathy=40, caution=55
    p = PersonaScores(initiative=82, analysis=65, empathy=40, caution=55)
    scores = compute_role_scores(p)
    assert scores["mafia"] == pytest.approx(67.55)
    assert scores["police"] == pytest.approx(61.0)
    assert scores["doctor"] == pytest.approx(45.25)
    assert scores["citizen"] == pytest.approx(50.0)


def test_compute_role_scores_matches_spec_example_player_p02():
    # spec §2.2 p_02: initiative=35, analysis=90, empathy=58, caution=70
    p = PersonaScores(initiative=35, analysis=90, empathy=58, caution=70)
    scores = compute_role_scores(p)
    assert scores["mafia"] == pytest.approx(46.2)
    assert scores["police"] == pytest.approx(82.0)
    assert scores["doctor"] == pytest.approx(62.2)
    assert scores["citizen"] == pytest.approx(50.0)


def test_citizen_score_is_always_the_fixed_baseline():
    high = PersonaScores(initiative=100, analysis=100, empathy=100, caution=100)
    low = PersonaScores(initiative=0, analysis=0, empathy=0, caution=0)
    assert compute_role_scores(high)["citizen"] == 50.0
    assert compute_role_scores(low)["citizen"] == 50.0
