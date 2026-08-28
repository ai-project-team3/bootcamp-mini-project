from app.mafia.models.persona import PersonaScores, PERSONA_AXES, NEUTRAL_SCORE


def test_persona_axes_are_the_four_spec_axes():
    assert set(PERSONA_AXES) == {"initiative", "analysis", "empathy", "caution"}


def test_valid_scores_pass_through_unchanged():
    p = PersonaScores(initiative=82, analysis=65, empathy=40, caution=55)
    assert p.initiative == 82
    assert p.analysis == 65
    assert p.empathy == 40
    assert p.caution == 55


def test_out_of_range_scores_clamp_to_0_100():
    p = PersonaScores(initiative=150, analysis=-20, empathy=0, caution=100)
    assert p.initiative == 100
    assert p.analysis == 0
    assert p.empathy == 0
    assert p.caution == 100


def test_from_partial_fills_missing_axis_with_neutral_score():
    p = PersonaScores.from_partial({"initiative": 82, "analysis": 65, "caution": 55})
    assert p.empathy == NEUTRAL_SCORE
    assert p.initiative == 82


def test_from_partial_with_empty_dict_gives_all_neutral_scores():
    p = PersonaScores.from_partial({})
    assert p.initiative == p.analysis == p.empathy == p.caution == NEUTRAL_SCORE
