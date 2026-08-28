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

from app.mafia.models.room import GamePhase, Player, Room


def act(room: Room, rng: random.Random | None = None) -> None:
    """Submit whatever the bots owe in the current phase.

    Safe to call on every state poll: each bot acts once per phase, because
    every branch checks the record it is about to write.
    """
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
