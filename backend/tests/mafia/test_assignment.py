from app.mafia.models.persona import PersonaScores
from app.mafia.roles.assignment import assign_roles, rank_top3
from app.mafia.roles.weights import compute_role_scores


def test_rank_top3_orders_by_score_descending_and_caps_at_three():
    scores = {"mafia": 10.0, "police": 90.0, "doctor": 50.0, "citizen": 50.0}
    top3 = rank_top3(scores)
    assert len(top3) == 3
    assert [role for role, _ in top3] == ["police", "doctor", "citizen"]


def test_assign_roles_gives_each_player_their_top_choice_when_no_conflict():
    # spec §2.2 examples: p_01's top choice is mafia, p_02's top choice is police
    players = {
        "p_01": PersonaScores.from_partial({"DOM": 82, "OBS": 65, "EMP": 40, "SPD": 55}),
        "p_02": PersonaScores.from_partial({"DOM": 35, "OBS": 90, "EMP": 58, "SPD": 70}),
    }
    capacity = {"mafia": 1, "police": 1, "doctor": 0, "citizen": 0}
    result = assign_roles(players, capacity)
    assert result["p_01"].role == "mafia"
    assert result["p_01"].assigned_by == "preference"
    assert result["p_02"].role == "police"
    assert result["p_02"].assigned_by == "preference"


def test_assign_roles_bumps_loser_to_second_choice_on_capacity_conflict():
    # Both players' top choice is police, second choice is doctor.
    # A's police score beats B's, so B must fall back to doctor.
    # Police wants high OBS and a low SPD (경찰은 서두르지 않는 쪽).
    player_a = PersonaScores.from_partial({"DOM": 50, "OBS": 100, "EMP": 50, "SPD": 0})
    player_b = PersonaScores.from_partial({"DOM": 50, "OBS": 90, "EMP": 50, "SPD": 10})
    assert rank_top3(compute_role_scores(player_a))[0][0] == "police"
    assert rank_top3(compute_role_scores(player_b))[0][0] == "police"

    capacity = {"mafia": 0, "police": 1, "doctor": 1, "citizen": 0}
    result = assign_roles({"a": player_a, "b": player_b}, capacity)
    assert result["a"].role == "police"
    assert result["b"].role == "doctor"
    assert result["a"].assigned_by == "preference"
    assert result["b"].assigned_by == "preference"


def test_assign_roles_never_exceeds_role_capacity():
    players = {
        f"p{i}": PersonaScores.from_partial({
            "DOM": i * 10 % 100,
            "OBS": (i * 7) % 100,
            "EMP": (i * 13) % 100,
            "SPD": (i * 3) % 100,
            "EXP": (i * 17) % 100,
        })
        for i in range(6)
    }
    capacity = {"mafia": 2, "police": 1, "doctor": 1, "citizen": 2}
    result = assign_roles(players, capacity)
    assert len(result) == 6
    counts = {}
    for assignment in result.values():
        counts[assignment.role] = counts.get(assignment.role, 0) + 1
    assert counts == capacity
