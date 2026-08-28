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
        "p_01": PersonaScores(initiative=82, analysis=65, empathy=40, caution=55),
        "p_02": PersonaScores(initiative=35, analysis=90, empathy=58, caution=70),
    }
    capacity = {"mafia": 1, "police": 1, "doctor": 0, "citizen": 0}
    result = assign_roles(players, capacity)
    assert result["p_01"].role == "mafia"
    assert result["p_01"].assigned_by == "preference"
    assert result["p_02"].role == "police"
    assert result["p_02"].assigned_by == "preference"


def test_assign_roles_bumps_loser_to_second_choice_on_capacity_conflict():
    # Both players' top choice is police, second choice is doctor.
    # A's police score (100) beats B's (90), so B must fall back to doctor.
    player_a = PersonaScores(initiative=50, analysis=100, empathy=50, caution=100)
    player_b = PersonaScores(initiative=50, analysis=90, empathy=50, caution=90)
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
        f"p{i}": PersonaScores(initiative=i * 10 % 100, analysis=(i * 7) % 100,
                                empathy=(i * 13) % 100, caution=(i * 3) % 100)
        for i in range(6)
    }
    capacity = {"mafia": 2, "police": 1, "doctor": 1, "citizen": 2}
    result = assign_roles(players, capacity)
    assert len(result) == 6
    counts = {}
    for assignment in result.values():
        counts[assignment.role] = counts.get(assignment.role, 0) + 1
    assert counts == capacity
