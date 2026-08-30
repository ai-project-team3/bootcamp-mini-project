import random

from app.mafia.models.room import Room
from app.mafia.game.votes import tally_votes


def test_tally_votes_returns_none_when_no_votes_cast():
    room = Room(room_id="r1", player_count=4)
    assert tally_votes(room) is None


def test_tally_votes_returns_clear_majority_target():
    room = Room(room_id="r1", player_count=4)
    room.votes = {"a": "x", "b": "x", "c": "y"}
    assert tally_votes(room) == "x"


def test_tally_votes_breaks_ties_randomly_among_tied_targets():
    room = Room(room_id="r1", player_count=4)
    room.votes = {"a": "x", "b": "y"}
    result = tally_votes(room, rng=random.Random(0))
    assert result in {"x", "y"}
