"""Test bots playing the parts nobody is holding.

The point of these seats is that one person can see a whole game happen. That
only works if the bots actually vote and act — otherwise every phase times out
with nothing decided, which tells the tester nothing.
"""

import random

from app.mafia.game import bots
from app.mafia.models.room import GamePhase, Player, Room


def _room(phase: GamePhase, roles: list[str], bot_flags: list[bool]) -> Room:
    room = Room(room_id="R", player_count=len(roles), phase=phase)
    for index, (role, is_bot) in enumerate(zip(roles, bot_flags)):
        pid = f"p{index}"
        room.players[pid] = Player(player_id=pid, nickname=pid, is_bot=is_bot, role=role)
    room.host_player_id = "p0"
    return room


def test_bots_vote_and_never_for_themselves():
    room = _room(GamePhase.DAY_VOTE, ["citizen"] * 4, [False, True, True, True])

    bots.act(room, random.Random(0))

    assert room.votes_confirmed == {"p1", "p2", "p3"}
    for voter, target in room.votes.items():
        assert voter != target


def test_a_human_is_left_to_vote_for_themselves():
    room = _room(GamePhase.DAY_VOTE, ["citizen"] * 4, [False, True, True, True])

    bots.act(room, random.Random(0))

    assert "p0" not in room.votes_confirmed


def test_a_bot_votes_once_however_often_the_room_is_polled():
    room = _room(GamePhase.DAY_VOTE, ["citizen"] * 4, [False, True, True, True])

    bots.act(room, random.Random(0))
    first = dict(room.votes)
    for _ in range(5):
        bots.act(room, random.Random(1))

    assert room.votes == first


def test_the_dead_do_not_vote():
    room = _room(GamePhase.DAY_VOTE, ["citizen"] * 4, [False, True, True, True])
    room.players["p1"].is_alive = False

    bots.act(room, random.Random(0))

    assert "p1" not in room.votes_confirmed


def test_the_accused_does_not_vote_on_their_own_execution():
    room = _room(GamePhase.EXECUTION_VOTE, ["citizen"] * 4, [False, True, True, True])
    room.accused_player_id = "p1"

    bots.act(room, random.Random(0))

    assert room.execution_confirmed == {"p2", "p3"}
    assert set(room.execution_votes.values()) <= {"guilty", "innocent"}


def test_each_night_role_uses_its_own_ability():
    room = _room(
        GamePhase.NIGHT_ACTION,
        ["mafia", "police", "doctor", "citizen"],
        [True, True, True, True],
    )

    bots.act(room, random.Random(3))

    assert room.night_actions["p0"][0] == "kill"
    assert room.night_actions["p1"][0] == "investigate"
    assert room.night_actions["p2"][0] == "protect"
    assert "p3" not in room.night_actions


def test_the_mafia_never_attacks_its_own():
    room = _room(
        GamePhase.NIGHT_ACTION,
        ["mafia", "mafia", "citizen", "citizen"],
        [True, True, True, True],
    )

    for seed in range(20):
        room.night_actions.clear()
        bots.act(room, random.Random(seed))
        _, target = room.night_actions["p0"]
        assert room.players[target].role != "mafia"


def test_nothing_happens_in_a_phase_with_no_bot_action():
    room = _room(GamePhase.DAY_DISCUSSION, ["citizen"] * 4, [True] * 4)

    bots.act(room, random.Random(0))

    assert room.votes == {}
    assert room.night_actions == {}
