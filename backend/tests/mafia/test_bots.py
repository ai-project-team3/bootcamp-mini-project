"""Test bots playing the parts nobody is holding.

The point of these seats is that one person can see a whole game happen. That
only works if the bots actually vote and act — otherwise every phase times out
with nothing decided, which tells the tester nothing.

They move one at a time, each after its own pause, so a room of bots reads
like a room of people rather than one tick where every seat resolves at once.
`_settle` is these tests standing in for the polling a phone does.
"""

import random

from app.mafia.game import bots
from app.mafia.models.room import GamePhase, Player, Room


def _settle(room: Room, rng_seed: int = 0, polls: int = 40) -> None:
    """Poll the room until the bots have taken every turn they owe.

    Time is passed in rather than slept through: one poll a second, which is
    what the frontend does, and enough of them to cover every bot's pause.
    """
    now = 1_000.0
    for _ in range(polls):
        bots.act(room, random.Random(rng_seed), now=now)
        now += 1.0


def _room(phase: GamePhase, roles: list[str], bot_flags: list[bool]) -> Room:
    room = Room(room_id="R", player_count=len(roles), phase=phase)
    for index, (role, is_bot) in enumerate(zip(roles, bot_flags)):
        pid = f"p{index}"
        room.players[pid] = Player(player_id=pid, nickname=pid, is_bot=is_bot, role=role)
    room.host_player_id = "p0"
    return room


def test_bots_vote_and_never_for_themselves():
    room = _room(GamePhase.DAY_VOTE, ["citizen"] * 4, [False, True, True, True])

    _settle(room)

    assert room.votes_confirmed == {"p1", "p2", "p3"}
    for voter, target in room.votes.items():
        assert voter != target


def test_a_human_is_left_to_vote_for_themselves():
    room = _room(GamePhase.DAY_VOTE, ["citizen"] * 4, [False, True, True, True])

    _settle(room)

    assert "p0" not in room.votes_confirmed


def test_a_bot_votes_once_however_often_the_room_is_polled():
    room = _room(GamePhase.DAY_VOTE, ["citizen"] * 4, [False, True, True, True])

    _settle(room)
    first = dict(room.votes)
    _settle(room, rng_seed=1)

    assert room.votes == first


def test_the_dead_do_not_vote():
    room = _room(GamePhase.DAY_VOTE, ["citizen"] * 4, [False, True, True, True])
    room.players["p1"].is_alive = False

    _settle(room)

    assert "p1" not in room.votes_confirmed


def test_the_accused_does_not_vote_on_their_own_execution():
    room = _room(GamePhase.EXECUTION_VOTE, ["citizen"] * 4, [False, True, True, True])
    room.accused_player_id = "p1"

    _settle(room)

    assert room.execution_confirmed == {"p2", "p3"}
    assert set(room.execution_votes.values()) <= {"guilty", "innocent"}


def test_each_night_role_uses_its_own_ability():
    room = _room(
        GamePhase.NIGHT_ACTION,
        ["mafia", "police", "doctor", "citizen"],
        [True, True, True, True],
    )

    _settle(room, rng_seed=3)

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
        room.bot_schedule_key = None
        _settle(room, rng_seed=seed)
        _, target = room.night_actions["p0"]
        assert room.players[target].role != "mafia"


def test_nothing_happens_in_a_phase_with_no_bot_action():
    room = _room(GamePhase.DAY_DISCUSSION, ["citizen"] * 4, [True] * 4)

    _settle(room)

    assert room.votes == {}
    assert room.night_actions == {}


def test_no_bot_acts_on_the_poll_the_phase_opens():
    """The bug this guards: a citizen never saw the night.

    Every actor the night needs — mafia, doctor, police — can be a bot, and the
    state machine ends a phase as soon as everyone who can act has. Acting on
    the first poll therefore ended the night before the screen had drawn.
    """
    room = _room(
        GamePhase.NIGHT_ACTION,
        ["mafia", "police", "doctor", "citizen"],
        [True, True, True, False],
    )

    bots.act(room, random.Random(0), now=1_000.0)

    assert room.night_actions == {}


def test_each_bot_takes_its_own_pause_rather_than_the_room_taking_one():
    room = _room(GamePhase.DAY_VOTE, ["citizen"] * 6, [False] + [True] * 5)
    low, high = bots.BOT_THINKING_SECONDS

    bots.act(room, random.Random(0), now=1_000.0)
    assert {low <= d - 1_000.0 <= high for d in room.bot_schedule.values()} == {True}
    assert len(set(room.bot_schedule.values())) > 1

    # Everyone is in before the shortest pause could have run twice, so the
    # wait does not grow with the size of the room.
    bots.act(room, random.Random(0), now=1_000.0 + high)
    assert len(room.votes_confirmed) == 5


def test_a_new_phase_draws_new_pauses():
    room = _room(GamePhase.DAY_VOTE, ["citizen"] * 5, [False] + [True] * 4)

    bots.act(room, random.Random(0), now=1_000.0)
    first = dict(room.bot_schedule)

    room.phase = GamePhase.NIGHT_ACTION
    bots.act(room, random.Random(1), now=2_000.0)

    assert room.bot_schedule != first


def test_every_bot_has_moved_once_the_room_has_been_polled_a_while():
    room = _room(
        GamePhase.NIGHT_ACTION,
        ["mafia", "police", "doctor", "citizen"],
        [True, True, True, False],
    )

    _settle(room)

    assert set(room.night_actions) == {"p0", "p1", "p2"}


def test_a_phase_with_no_deadline_still_gets_played():
    room = _room(GamePhase.DAY_VOTE, ["citizen"] * 4, [False, True, True, True])

    _settle(room)

    assert room.votes_confirmed == {"p1", "p2", "p3"}


def test_skipping_a_phase_still_gets_the_bots_moves():
    """The host's 건너뛰기 must not skip past the bots.

    Before this, a skipped vote accused nobody and a skipped night attacked
    nobody, so day and night cycled forever with nothing ever happening.
    """
    room = _room(
        GamePhase.NIGHT_ACTION,
        ["mafia", "police", "doctor", "citizen"],
        [True, True, True, False],
    )

    bots.act(room, random.Random(0), force=True)

    assert set(room.night_actions) == {"p0", "p1", "p2"}
