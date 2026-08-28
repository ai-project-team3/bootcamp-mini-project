import random
from collections import Counter

from app.mafia.persona.provider import MockPersonaProvider
from app.mafia.roles.assignment import assign_roles
from app.mafia.roles.capacity import get_role_capacity


def run_simulation(player_count: int, trials: int, seed: int = 42) -> dict:
    capacity = get_role_capacity(player_count)
    rng = random.Random(seed)
    provider = MockPersonaProvider(seed=seed)

    role_counts: Counter = Counter()
    fallback_counts: Counter = Counter()

    for _ in range(trials):
        player_ids = [f"p{i}" for i in range(player_count)]
        personas = provider.get_personas(player_ids)
        assignments = assign_roles(personas, capacity, rng)
        for assignment in assignments.values():
            role_counts[assignment.role] += 1
            if assignment.assigned_by == "fallback_random":
                fallback_counts[assignment.role] += 1

    return {
        "trials": trials,
        "player_count": player_count,
        "role_distribution": dict(role_counts),
        "fallback_rate_by_role": {
            role: (fallback_counts[role] / role_counts[role]) if role_counts[role] else 0.0
            for role in capacity
        },
    }


if __name__ == "__main__":
    for player_count in (4, 5, 6):
        print(run_simulation(player_count, trials=1000))
