_ROLE_CAPACITY: dict[int, dict[str, int]] = {
    4: {"mafia": 1, "police": 1, "doctor": 1, "citizen": 1},
    5: {"mafia": 1, "police": 1, "doctor": 1, "citizen": 2},
    6: {"mafia": 2, "police": 1, "doctor": 1, "citizen": 2},
}


def get_role_capacity(player_count: int) -> dict[str, int]:
    if player_count not in _ROLE_CAPACITY:
        raise ValueError(
            f"Unsupported player_count: {player_count}. Supported: 4, 5, 6"
        )
    return dict(_ROLE_CAPACITY[player_count])
