from app.mafia.models.persona import PersonaScores, PERSONA_AXES, NEUTRAL_SCORE


def test_persona_axes_are_the_icebreaking_runs_five():
    """The run that measures them owns the schema — docs/페르소나-인계.md."""
    assert set(PERSONA_AXES) == {"DOM", "SPD", "EXP", "EMP", "OBS"}


def test_valid_scores_pass_through_unchanged():
    p = PersonaScores(DOM=82, SPD=55, EXP=30, EMP=40, OBS=65)
    assert (p.DOM, p.SPD, p.EXP, p.EMP, p.OBS) == (82, 55, 30, 40, 65)


def test_out_of_range_scores_clamp_to_0_100():
    p = PersonaScores(DOM=150, SPD=100, EXP=-5, EMP=0, OBS=-20)
    assert (p.DOM, p.SPD, p.EXP, p.EMP, p.OBS) == (100, 100, 0, 0, 0)


def test_from_partial_fills_missing_axes_with_neutral_score():
    """A player the icebreaking run never saw is average, not absent."""
    p = PersonaScores.from_partial({"DOM": 82, "OBS": 65})

    assert p.DOM == 82
    assert p.OBS == 65
    assert p.EMP == NEUTRAL_SCORE
    assert p.EXP == NEUTRAL_SCORE
    assert p.SPD == NEUTRAL_SCORE


def test_from_partial_with_empty_dict_gives_all_neutral_scores():
    p = PersonaScores.from_partial({})

    assert {getattr(p, axis) for axis in PERSONA_AXES} == {NEUTRAL_SCORE}


def test_from_partial_ignores_axes_it_does_not_know():
    """The run may grow an ability before this game learns about it."""
    p = PersonaScores.from_partial({"DOM": 70, "CHARISMA": 99})

    assert p.DOM == 70
    assert not hasattr(p, "CHARISMA")
