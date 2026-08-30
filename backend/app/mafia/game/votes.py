import random
from collections import Counter

from app.mafia.models.room import Room


def tally_votes(room: Room, rng: random.Random | None = None) -> str | None:
    if not room.votes:
        return None
    rng = rng or random.Random()
    counts = Counter(room.votes.values())
    max_count = max(counts.values())
    tied = [target for target, count in counts.items() if count == max_count]
    return rng.choice(tied)
