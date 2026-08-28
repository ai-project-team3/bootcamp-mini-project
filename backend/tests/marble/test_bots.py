"""Test bots taking their turns.

This game waits on the current player and nothing else, so a seat the demo
filled would stop the board dead. These tests hold the line that it does not,
and that the bots never take a move that belongs to a person.
"""

import random

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.marble.game import bots, engine
from app.marble.handoff import create_room_for
from app.marble.models.room import GamePhase
from app.marble.store import store


@pytest.fixture(autouse=True)
def clean_store():
    store.clear()
    yield
    store.clear()


_clock = [0.0]


def _t() -> float:
    """A clock that always says enough time has passed for the next bot move."""
    _clock[0] += bots.BOT_MOVE_INTERVAL_SECONDS
    return _clock[0]


def _started_room(bot_flags: list[bool]):
    names = [f"p{i}" for i in range(len(bot_flags))]
    room_id, player_ids = create_room_for(names, 0, None, bot_flags)
    room = store.get(room_id)
    engine.start_game(room)
    return room, player_ids


def test_a_bot_takes_its_turn_instead_of_stopping_the_board():
    room, player_ids = _started_room([False, True])
    engine.advance_turn(room)
    assert room.current_player_id == player_ids[1]

    acted = bots.take_pending_turn(room, random.Random(0), now=_t())

    assert acted is True
    assert room.phase is not GamePhase.ROLL_DICE


def test_a_persons_turn_is_left_alone():
    room, player_ids = _started_room([False, True])
    assert room.current_player_id == player_ids[0]

    assert bots.take_pending_turn(room, random.Random(0), now=_t()) is False
    assert room.phase is GamePhase.ROLL_DICE


def test_one_move_per_call_so_a_watcher_sees_it_happen():
    room, player_ids = _started_room([False, True])
    engine.advance_turn(room)

    bots.take_pending_turn(room, random.Random(0), now=_t())

    # Rolled, and now stopped on whatever the roll opened — not played through.
    assert room.phase in (GamePhase.SHOW_QUIZ, GamePhase.SUBMIT_ANSWER)
    assert room.current_player_id == player_ids[1]


def test_polling_carries_a_bot_turn_through_to_the_next_player():
    room, player_ids = _started_room([False, True])
    engine.advance_turn(room)

    for _ in range(12):
        if room.current_player_id == player_ids[0] or room.phase is GamePhase.GAME_OVER:
            break
        bots.take_pending_turn(room, random.Random(1), now=_t())

    assert room.current_player_id == player_ids[0] or room.phase is GamePhase.GAME_OVER


def test_an_all_bot_room_plays_itself_to_the_end():
    room, _ = _started_room([True, True])

    for _ in range(400):
        if room.phase is GamePhase.GAME_OVER:
            break
        assert bots.take_pending_turn(room, random.Random(7), now=_t()) is True

    assert room.phase is GamePhase.GAME_OVER
    assert room.winner_id is not None


def test_the_state_poll_is_what_moves_them():
    room, player_ids = _started_room([False, True])
    engine.advance_turn(room)
    client = TestClient(app)

    state = client.get(f"/marble/rooms/{room.room_id}/state").json()

    assert state["phase"] != GamePhase.ROLL_DICE.value


def test_a_bot_move_waits_long_enough_to_be_watched():
    room, player_ids = _started_room([False, True])
    engine.advance_turn(room)
    now = 1000.0

    assert bots.take_pending_turn(room, random.Random(0), now=now) is True
    assert bots.take_pending_turn(room, random.Random(0), now=now + 0.5) is False
    assert bots.take_pending_turn(
        room, random.Random(0), now=now + bots.BOT_MOVE_INTERVAL_SECONDS
    ) is True
