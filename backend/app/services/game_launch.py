"""Handing a gathered group over to a minigame that runs its own rooms.

The shared room (`services/demo_rooms`) is where people meet and where the host
picks a game. Most games are played inside that room, but 마피아 and 커플
브루마블 each keep their own room system, so picking one has to build a room
over there and remember which of its players is which of ours.

Each game owns its own room construction in `<game>/handoff.py`; this module is
only the registry that maps a game id to it, so the shared room never imports a
game's models or store directly.
"""

from dataclasses import dataclass
from typing import Callable

from ..mafia import handoff as mafia_handoff
from ..marble import handoff as marble_handoff


class GameLaunchError(Exception):
    """The chosen game cannot be started for this group."""


@dataclass(frozen=True)
class LaunchedGame:
    game_id: str
    room_id: str
    #: shared-room player id -> that same person's id inside the game's room.
    #: Kept server-side; each player claims only their own.
    player_ids: dict[str, str]


@dataclass(frozen=True)
class LaunchablePlayer:
    id: str
    nickname: str
    is_host: bool


#: game id -> (nicknames, host_index, options) -> (room_id, player_ids in order)
_LAUNCHERS: dict[str, Callable[[list[str], int, dict[str, str] | None], tuple[str, list[str]]]] = {
    'mafia': mafia_handoff.create_room_for,
    'marble': marble_handoff.create_room_for,
}


def is_launchable(game_id: str) -> bool:
    """Whether this game runs in a room of its own rather than in the shared one."""
    return game_id in _LAUNCHERS


def launch(
    game_id: str,
    players: list[LaunchablePlayer],
    options: dict[str, str] | None = None,
) -> LaunchedGame:
    """Start `game_id` for this group.

    `options` is whatever that game asked the host for when it was picked —
    커플 브루마블's 일반/19금 mode, for instance. Each game reads only the keys
    it knows; the shared room does not interpret them.
    """
    launcher = _LAUNCHERS.get(game_id)
    if launcher is None:
        raise GameLaunchError('이 게임은 방을 따로 만들지 않습니다')
    if not players:
        raise GameLaunchError('참가자가 없습니다')

    host_index = next((i for i, player in enumerate(players) if player.is_host), 0)
    try:
        room_id, game_player_ids = launcher(
            [player.nickname for player in players], host_index, options
        )
    except (mafia_handoff.MafiaHandoffError, marble_handoff.MarbleHandoffError) as error:
        # The games speak for themselves about their own size limits.
        raise GameLaunchError(str(error)) from error

    return LaunchedGame(
        game_id=game_id,
        room_id=room_id,
        player_ids={
            player.id: game_player_id
            for player, game_player_id in zip(players, game_player_ids)
        },
    )
