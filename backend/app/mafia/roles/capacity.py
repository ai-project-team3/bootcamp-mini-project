"""Role slots per room size.

This table is the single source of truth for how many players a room may have —
`app.mafia.constants.ALLOWED_PLAYER_COUNTS` derives from it, so the two can
never drift apart. Every row must sum to its player count, or some player ends
up without a role.
"""

_ROLE_CAPACITY: dict[int, dict[str, int]] = {
    4: {"mafia": 1, "police": 1, "doctor": 1, "citizen": 1},
    5: {"mafia": 1, "police": 1, "doctor": 1, "citizen": 2},
    6: {"mafia": 2, "police": 1, "doctor": 1, "citizen": 2},
    7: {"mafia": 3, "police": 1, "doctor": 1, "citizen": 2},
    8: {"mafia": 3, "police": 1, "doctor": 1, "citizen": 3},
}

SUPPORTED_PLAYER_COUNTS: tuple[int, ...] = tuple(sorted(_ROLE_CAPACITY))


def get_role_capacity(player_count: int) -> dict[str, int]:
    if player_count not in _ROLE_CAPACITY:
        supported = ", ".join(str(n) for n in SUPPORTED_PLAYER_COUNTS)
        raise ValueError(
            f"Unsupported player_count: {player_count}. Supported: {supported}"
        )
    return dict(_ROLE_CAPACITY[player_count])
