"""Test bots voting and acting at night.

Unlike 커플 브루마블 this game has a clock, so an unplayed bot seat does not
deadlock — every phase times out on its own. What it does instead is make a
solo test tell you nothing: nobody is ever executed, no one is ever attacked,
and each phase burns its full timer. These bots make the game actually happen.

Choices are deliberately random rather than clever. The point is to exercise
the flow, and a bot that played well would make the human's own game harder to
read.
"""

import random
import time

from app.mafia.game import timing
from app.mafia.models.room import GamePhase, Player, Room

#: How long each phase the bots take part in runs for.
_PHASE_SECONDS = {
    GamePhase.DAY_VOTE: timing.DAY_VOTE_SECONDS,
    GamePhase.EXECUTION_VOTE: timing.EXECUTION_VOTE_SECONDS,
    GamePhase.NIGHT_ACTION: timing.NIGHT_ACTION_SECONDS,
}

#: How much of a phase the bots let pass before acting.
#:
#: Without this the game skips: the state machine ends a phase the moment
#: everyone who *can* act has, and a phase's required actors are often bots
#: alone. A citizen watching the night sees mafia, doctor and police all move
#: on the first poll and the night is over before the screen has drawn; the
#: same happens in the execution vote to whoever is on trial. Waiting most of
#: the phase out gives the human time to read what is happening, while still
#: ending early once they have taken their own turn.
THINKING_FRACTION = 0.55


def _still_thinking(room: Room, now: float) -> bool:
    length = _PHASE_SECONDS.get(room.phase)
    if length is None or room.phase_deadline is None:
        return False
    return (room.phase_deadline - now) > length * (1 - THINKING_FRACTION)


def act(
    room: Room,
    rng: random.Random | None = None,
    now: float | None = None,
    force: bool = False,
) -> None:
    """Submit whatever the bots owe in the current phase.

    Safe to call on every state poll: each bot acts once per phase, because
    every branch checks the record it is about to write.

    `force` skips the thinking pause. The host's 건너뛰기 ends a phase early,
    and without this the phase would resolve before the bots had voted or acted
    — nobody accused, nobody attacked — so day and night cycled forever with
    nothing ever happening.
    """
    if not force and _still_thinking(room, time.time() if now is None else now):
        return
    chooser = rng or random
    if room.phase is GamePhase.DAY_VOTE:
        _vote(room, chooser)
    elif room.phase is GamePhase.EXECUTION_VOTE:
        _execution_vote(room, chooser)
    elif room.phase is GamePhase.NIGHT_ACTION:
        _night(room, chooser)


def _alive_bots(room: Room) -> list[Player]:
    return [p for p in room.players.values() if p.is_bot and p.is_alive]


def _alive_ids(room: Room) -> list[str]:
    return [p.player_id for p in room.players.values() if p.is_alive]


def _vote(room: Room, chooser: random.Random) -> None:
    for bot in _alive_bots(room):
        if bot.player_id in room.votes_confirmed:
            continue
        targets = [pid for pid in _alive_ids(room) if pid != bot.player_id]
        if not targets:
            continue
        room.votes[bot.player_id] = chooser.choice(targets)
        room.votes_confirmed.add(bot.player_id)


def _execution_vote(room: Room, chooser: random.Random) -> None:
    for bot in _alive_bots(room):
        if bot.player_id == room.accused_player_id:
            continue
        if bot.player_id in room.execution_confirmed:
            continue
        room.execution_votes[bot.player_id] = chooser.choice(["guilty", "innocent"])
        room.execution_confirmed.add(bot.player_id)


def _night(room: Room, chooser: random.Random) -> None:
    for bot in _alive_bots(room):
        if bot.player_id in room.night_actions:
            continue
        if bot.role == "mafia":
            targets = [
                pid for pid in _alive_ids(room)
                if pid != bot.player_id and room.players[pid].role != "mafia"
            ]
            if targets:
                room.night_actions[bot.player_id] = ("kill", chooser.choice(targets))
        elif bot.role == "doctor":
            # The doctor may protect itself, so every alive player is a target.
            room.night_actions[bot.player_id] = ("protect", chooser.choice(_alive_ids(room)))
        elif bot.role == "police":
            targets = [pid for pid in _alive_ids(room) if pid != bot.player_id]
            if targets:
                target_id = chooser.choice(targets)
                room.night_actions[bot.player_id] = ("investigate", target_id)
                # A bot's finding is never shown to anyone, so unlike the real
                # police action there is nothing to record on the room.
