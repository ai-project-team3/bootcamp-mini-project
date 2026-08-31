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

from app.mafia.models.room import GamePhase, Player, Room

#: How long a bot takes to make up its mind, in seconds.
#:
#: Each bot draws its own pause in this range when a phase opens, so the seats
#: fill in one after another over a few seconds rather than every one of them
#: resolving on a single tick — which is what a room of people looks like.
#:
#: The pauses run side by side rather than back to back on purpose. Queueing
#: them made the wait grow with the room: eight players meant six execution
#: votes at up to five seconds each, and that phase only lasts twenty, so the
#: vote closed with half the room yet to speak and nobody was ever executed.
BOT_THINKING_SECONDS = (2.0, 5.0)


def _schedule(room: Room, chooser: random.Random, now: float) -> dict[str, float]:
    """When each bot acts in the phase the room is in now.

    Redrawn whenever the phase (or the day, or the night) changes, so every
    phase gets a fresh spread instead of one order repeating all game.
    """
    key = (room.phase, room.day_number, room.night_number)
    if room.bot_schedule_key != key:
        room.bot_schedule_key = key
        room.bot_schedule = {
            player.player_id: now + chooser.uniform(*BOT_THINKING_SECONDS)
            for player in room.players.values()
            if player.is_bot
        }
    return room.bot_schedule


def _ready(room: Room, bot_id: str, now: float) -> bool:
    return room.bot_schedule.get(bot_id, now) <= now


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
    moment = time.time() if now is None else now
    chooser = rng or random
    ready = _ready_bots(room, chooser, moment, force)
    if not ready:
        return
    if room.phase is GamePhase.DAY_VOTE:
        _vote(room, chooser, ready)
    elif room.phase is GamePhase.EXECUTION_VOTE:
        _execution_vote(room, chooser, ready)
    elif room.phase is GamePhase.NIGHT_ACTION:
        _night(room, chooser, ready)


def _ready_bots(
    room: Room, chooser: random.Random, now: float, force: bool
) -> list[Player]:
    """The living bots whose pause has run out."""
    alive = _alive_bots(room)
    if force:
        return alive
    _schedule(room, chooser, now)
    return [bot for bot in alive if _ready(room, bot.player_id, now)]


def _alive_bots(room: Room) -> list[Player]:
    return [p for p in room.players.values() if p.is_bot and p.is_alive]


def _alive_ids(room: Room) -> list[str]:
    return [p.player_id for p in room.players.values() if p.is_alive]


def _vote(room: Room, chooser: random.Random, ready: list[Player]) -> None:
    for bot in ready:
        if bot.player_id in room.votes_confirmed:
            continue
        targets = [pid for pid in _alive_ids(room) if pid != bot.player_id]
        if not targets:
            continue
        room.votes[bot.player_id] = chooser.choice(targets)
        room.votes_confirmed.add(bot.player_id)


def _execution_vote(room: Room, chooser: random.Random, ready: list[Player]) -> None:
    for bot in ready:
        if bot.player_id == room.accused_player_id:
            continue
        if bot.player_id in room.execution_confirmed:
            continue
        room.execution_votes[bot.player_id] = chooser.choice(["guilty", "innocent"])
        room.execution_confirmed.add(bot.player_id)


def _night(room: Room, chooser: random.Random, ready: list[Player]) -> None:
    for bot in ready:
        if bot.player_id in room.night_actions:
            continue
        if bot.role == "mafia":
            targets = [
                pid for pid in _alive_ids(room)
                if pid != bot.player_id and room.players[pid].role != "mafia"
            ]
            if not targets:
                continue
            room.night_actions[bot.player_id] = ("kill", chooser.choice(targets))
        if bot.role == "doctor":
            # The doctor may protect itself, so every alive player is a target.
            room.night_actions[bot.player_id] = ("protect", chooser.choice(_alive_ids(room)))
        if bot.role == "police":
            targets = [pid for pid in _alive_ids(room) if pid != bot.player_id]
            if not targets:
                continue
            room.night_actions[bot.player_id] = ("investigate", chooser.choice(targets))
            # A bot's finding is never shown to anyone, so unlike the real
            # police action there is nothing to record on the room.
