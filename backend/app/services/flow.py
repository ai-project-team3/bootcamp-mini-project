"""Which phases a room can run, given how many people are in it.

Plan doc §2 allows a room of one. Several stages need somebody else in the
room — you cannot vote for another player, catch another player's lie, or be
assigned another player's card on your own — so those stages are skipped
rather than left to stall forever waiting for submissions that cannot arrive.

Keep the ordering here and nowhere else. Routers ask for the next phase; they
do not each decide what follows what.
"""

PHASE_ORDER: tuple[str, ...] = (
    "IMPRESSION_PRE",
    "ANSWER",
    "STATEMENT",
    "IMPRESSION_POST",
    "TYPE_GUESS",
)

DONE = "DONE"

# Smallest room in which the stage means anything.
#   IMPRESSION_*  three, because with two people every one of the five
#                 questions has the same single answer available
#   STATEMENT     two, so there is somebody to fool
#   ANSWER        one, it only ever reads your own choices
#   TYPE_GUESS    one; alone you still pick the type you expect to get, and
#                 the card-assignment half is simply empty
_MIN_PLAYERS: dict[str, int] = {
    "IMPRESSION_PRE": 3,
    "ANSWER": 1,
    "STATEMENT": 2,
    "IMPRESSION_POST": 3,
    "TYPE_GUESS": 1,
}


def phase_runs(phase: str, player_count: int) -> bool:
    return player_count >= _MIN_PLAYERS.get(phase, 1)


def first_phase(player_count: int) -> str:
    for phase in PHASE_ORDER:
        if phase_runs(phase, player_count):
            return phase
    return DONE


def next_phase(current: str, player_count: int) -> str:
    """The phase after `current`, skipping any that this room is too small for.

    An unknown phase returns DONE rather than raising: a room that somehow
    reaches a state we do not recognise should end, not hang.
    """
    if current not in PHASE_ORDER:
        return DONE
    start = PHASE_ORDER.index(current) + 1
    for phase in PHASE_ORDER[start:]:
        if phase_runs(phase, player_count):
            return phase
    return DONE


def skipped_phases(player_count: int) -> list[str]:
    """For telling the room what it will not be playing. Display only."""
    return [p for p in PHASE_ORDER if not phase_runs(p, player_count)]
