"""Board generation: tile mix reflects the two players' combined persona stats."""

from __future__ import annotations

import random

from app.marble.models.room import PersonaStats, Tile, TileType

STAT_KEYS = ["logic", "empathy", "drive", "caution"]

STAT_TILE_TYPES = {
    "logic": TileType.LOGIC,
    "empathy": TileType.EMPATHY,
    "drive": TileType.DRIVE,
    "caution": TileType.CAUTION,
}

STAT_TILE_COUNT = 8
CHANCE_TILE_COUNT = 3


def allocate_stat_tile_counts(weights: dict[str, int]) -> dict[str, int]:
    """Split STAT_TILE_COUNT tiles across the four stats by largest remainder.

    Every weight gets +1 first so an all-zero persona pair still yields an even
    split instead of dividing by zero.
    """
    adjusted = [weights[key] + 1 for key in STAT_KEYS]
    total = sum(adjusted)

    raw = [(w / total) * STAT_TILE_COUNT for w in adjusted]
    counts = [int(value) for value in raw]
    remainder = STAT_TILE_COUNT - sum(counts)

    order = sorted(range(len(raw)), key=lambda i: raw[i] - int(raw[i]), reverse=True)
    for i in range(remainder):
        counts[order[i]] += 1

    return dict(zip(STAT_KEYS, counts))


def generate_board(*stats: PersonaStats) -> list[Tile]:
    """Build the board from everyone at the table.

    The tile mix leans toward the traits the room scores highest on, so a room
    of cautious people gets more caution tiles. Any number of players works —
    the weights are just a sum.
    """
    weights = {key: sum(getattr(s, key) for s in stats) for key in STAT_KEYS}
    counts = allocate_stat_tile_counts(weights)

    tiles: list[TileType] = []
    for key in STAT_KEYS:
        tiles.extend([STAT_TILE_TYPES[key]] * counts[key])
    tiles.extend([TileType.CHANCE] * CHANCE_TILE_COUNT)

    random.shuffle(tiles)

    board = [Tile(index=0, type=TileType.START)]
    board.extend(Tile(index=i + 1, type=t) for i, t in enumerate(tiles))
    return board
