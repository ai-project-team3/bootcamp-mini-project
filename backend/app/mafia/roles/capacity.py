"""Role slots per room size.

This table is the single source of truth for how many players a room may have —
`app.mafia.constants.ALLOWED_PLAYER_COUNTS` derives from it, so the two can
never drift apart. Every row must sum to its player count, or some player ends
up without a role.

The split is one mafia, one police, one doctor and citizens for the rest at
every size. That came out of measuring the actual game: 8,000 simulated games
per size, played two ways — a town that votes at random, and a town that acts on
the police's findings. The mafia win rate lands at 68 / 47 / 51 / 38 / 43 % for
4 / 5 / 6 / 7 / 8 players, an average of 8 points away from even.

A second mafia was tried and is far worse: it swings the win rate to 85~96 %,
because the round in which the mafia reach parity with the town arrives one or
two nights sooner. There is no split in between — the mafia count is a whole
number, so 4~8 player rooms cannot be tuned to exactly even. Four players stays
mafia-favoured and seven stays town-favoured no matter how the roles are dealt.
"""

_ROLE_CAPACITY: dict[int, dict[str, int]] = {
    4: {"mafia": 1, "police": 1, "doctor": 1, "citizen": 1},
    5: {"mafia": 1, "police": 1, "doctor": 1, "citizen": 2},
    6: {"mafia": 1, "police": 1, "doctor": 1, "citizen": 3},
    7: {"mafia": 1, "police": 1, "doctor": 1, "citizen": 4},
    8: {"mafia": 1, "police": 1, "doctor": 1, "citizen": 5},
}

SUPPORTED_PLAYER_COUNTS: tuple[int, ...] = tuple(sorted(_ROLE_CAPACITY))


def get_role_capacity(player_count: int) -> dict[str, int]:
    if player_count not in _ROLE_CAPACITY:
        supported = ", ".join(str(n) for n in SUPPORTED_PLAYER_COUNTS)
        raise ValueError(
            f"Unsupported player_count: {player_count}. Supported: {supported}"
        )
    return dict(_ROLE_CAPACITY[player_count])
