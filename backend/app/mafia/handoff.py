"""Building a mafia room around a group that has already gathered.

The app's shared room brings people together before any game is chosen, so by
the time 마피아 is picked the players, their nicknames and their host all exist
already. This creates the mafia room around them instead of sending everyone
back to type a nickname and an invite code a second time.

The mafia package owns this because room construction is its own business: the
host app only asks for a room and gets ids back, and never reaches into the
game's models or store itself.
"""

import uuid

from app.mafia.constants import ALLOWED_PLAYER_COUNTS
from app.mafia.models.room import Player, Room
from app.mafia.store import store
from app.mafia.utils.room_code import generate_room_code

MIN_PLAYERS = min(ALLOWED_PLAYER_COUNTS)
MAX_PLAYERS = max(ALLOWED_PLAYER_COUNTS)


class MafiaHandoffError(Exception):
    """The gathered group cannot be turned into a mafia room."""


def check_player_count(count: int) -> None:
    """Raise if a group this size has no role table to be dealt from."""
    if count not in ALLOWED_PLAYER_COUNTS:
        allowed = ", ".join(str(n) for n in ALLOWED_PLAYER_COUNTS)
        raise MafiaHandoffError(f"마피아는 {allowed}명일 때만 시작할 수 있어요")


def create_room_for(
    nicknames: list[str],
    host_index: int = 0,
    options: dict[str, str] | None = None,
) -> tuple[str, list[str]]:
    """Seat a whole group in a new mafia room.

    Returns the room code and one player id per nickname, in the same order, so
    the caller can hand each person their own id without exposing anyone else's.
    `options` is the per-game settings the host chose; mafia's room size comes
    from the group itself, so there is nothing here for it to read yet.
    """
    check_player_count(len(nicknames))
    if not 0 <= host_index < len(nicknames):
        raise MafiaHandoffError("방장을 찾을 수 없어요")

    room = Room(room_id=_new_room_id(), player_count=len(nicknames))
    player_ids: list[str] = []
    for nickname in nicknames:
        player_id = str(uuid.uuid4())
        room.players[player_id] = Player(player_id=player_id, nickname=nickname)
        player_ids.append(player_id)
    room.host_player_id = player_ids[host_index]
    store.create(room)
    return room.room_id, player_ids


def _new_room_id() -> str:
    for _ in range(20):
        code = generate_room_code()
        if not store.exists(code):
            return code
    raise MafiaHandoffError("방 코드를 생성하지 못했어요. 다시 시도해주세요")
