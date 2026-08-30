import random

from app.mafia.models.persona import PersonaScores
from app.mafia.roles.assignment import assign_roles, fill_remaining_with_fallback, RoleAssignment


def test_fallback_prefers_lowest_empathy_for_mafia():
    players = {
        "a": PersonaScores.from_partial({"DOM": 50, "OBS": 50, "EMP": 90, "SPD": 50}),
        "b": PersonaScores.from_partial({"DOM": 50, "OBS": 50, "EMP": 50, "SPD": 50}),
        "c": PersonaScores.from_partial({"DOM": 50, "OBS": 50, "EMP": 70, "SPD": 50}),
    }
    assigned: dict[str, RoleAssignment] = {}
    remaining = {"mafia": 1}

    fill_remaining_with_fallback(players, assigned, remaining, random.Random(0))

    assert assigned["b"].role == "mafia"
    assert assigned["b"].assigned_by == "fallback_random"
    assert "a" not in assigned
    assert "c" not in assigned
    assert remaining["mafia"] == 0


def test_fallback_fills_non_mafia_roles_randomly():
    players = {
        "a": PersonaScores.from_partial({"DOM": 50, "OBS": 50, "EMP": 50, "SPD": 50}),
        "b": PersonaScores.from_partial({"DOM": 50, "OBS": 50, "EMP": 50, "SPD": 50}),
    }
    assigned: dict[str, RoleAssignment] = {}
    remaining = {"citizen": 2}

    fill_remaining_with_fallback(players, assigned, remaining, random.Random(0))

    assert assigned["a"].role == "citizen"
    assert assigned["b"].role == "citizen"
    assert assigned["a"].assigned_by == "fallback_random"
    assert assigned["b"].assigned_by == "fallback_random"


def test_assign_roles_triggers_mafia_fallback_when_nobody_prefers_it():
    # Low initiative/caution + high empathy pushes every player's mafia
    # score below doctor/citizen/police, so mafia never appears in anyone's
    # top-3 preference and must be force-filled (spec §3.6 exception).
    players = {
        "p1": PersonaScores.from_partial({"DOM": 10, "OBS": 50, "EMP": 95, "SPD": 10}),
        "p2": PersonaScores.from_partial({"DOM": 10, "OBS": 50, "EMP": 85, "SPD": 10}),
        "p3": PersonaScores.from_partial({"DOM": 10, "OBS": 50, "EMP": 75, "SPD": 10}),
    }
    capacity = {"mafia": 1, "doctor": 1, "citizen": 1, "police": 0}

    result = assign_roles(players, capacity, rng=random.Random(0))

    assert len(result) == 3
    counts = {}
    for assignment in result.values():
        counts[assignment.role] = counts.get(assignment.role, 0) + 1
    assert counts == {"mafia": 1, "doctor": 1, "citizen": 1}
    mafia_assignment = next(a for a in result.values() if a.role == "mafia")
    assert mafia_assignment.assigned_by == "fallback_random"
