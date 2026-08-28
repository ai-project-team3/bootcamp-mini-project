from app.mafia.roles.capacity import get_role_capacity
from app.mafia.validation.simulate import run_simulation


def test_run_simulation_never_violates_role_capacity():
    for player_count in (4, 5, 6):
        result = run_simulation(player_count, trials=100, seed=42)
        capacity = get_role_capacity(player_count)
        for role, cap in capacity.items():
            assert result["role_distribution"].get(role, 0) == cap * 100


def test_run_simulation_reports_fallback_rate_per_role():
    result = run_simulation(4, trials=50, seed=1)
    assert set(result["fallback_rate_by_role"].keys()) == {"mafia", "police", "doctor", "citizen"}
    for rate in result["fallback_rate_by_role"].values():
        assert 0.0 <= rate <= 1.0


def test_run_simulation_is_deterministic_given_the_same_seed():
    a = run_simulation(6, trials=20, seed=7)
    b = run_simulation(6, trials=20, seed=7)
    assert a == b
