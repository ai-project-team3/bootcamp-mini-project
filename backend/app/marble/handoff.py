"""Building a couple-marble room around a group that has already gathered.

The mirror of `app.mafia.handoff`: the app's shared room already knows who is
playing, so the marble room is created with everyone seated rather than making
each person join again. The content mode still belongs to the group, so it is
passed in and defaults to 일반 모드.
"""

import uuid

from app.marble.models.room import MAX_PLAYERS, MIN_PLAYERS, ContentMode, Player, Room
from app.marble.persona.provider import MockPersonaProvider, persona_from_icebreaking
from app.marble.store import store
from app.marble.utils.room_code import generate_room_code

# TODO: 실제 페르소나 API 연동 시 routers/rooms.py 의 provider 와 함께 교체한다.
persona_provider = MockPersonaProvider()


class MarbleHandoffError(Exception):
    """The gathered group cannot be turned into a marble room."""


def check_player_count(count: int) -> None:
    if not MIN_PLAYERS <= count <= MAX_PLAYERS:
        raise MarbleHandoffError(
            f"커플 브루마블은 {MIN_PLAYERS}~{MAX_PLAYERS}명일 때 시작할 수 있어요"
        )


VALID_CONTENT_MODES = ("general", "adult")


def create_room_for(
    nicknames: list[str],
    host_index: int = 0,
    options: dict[str, str] | None = None,
    bots: list[bool] | None = None,
    personas: list[dict[str, int] | None] | None = None,
) -> tuple[str, list[str]]:
    """Seat a whole group in a new marble room.

    Returns the room code and one player id per nickname, in the same order.
    Seating order is the order given, which is the order people joined the
    shared room, so turns follow the same sequence everyone already saw.

    `options["content_mode"]` carries the host's 일반/19금 choice. It used to be
    made on this game's own lobby screen, which a launched group never sees, so
    it is asked for when the game is picked instead. Anything unrecognised is
    refused rather than quietly played as 일반 모드.
    """
    content_mode = (options or {}).get("content_mode", "general")
    if content_mode not in VALID_CONTENT_MODES:
        raise MarbleHandoffError("알 수 없는 모드입니다")
    check_player_count(len(nicknames))
    if not 0 <= host_index < len(nicknames):
        raise MarbleHandoffError("방장을 찾을 수 없어요")

    room = Room(
        room_id=_new_room_id(),
        content_mode=ContentMode(content_mode),
        max_players=len(nicknames),
    )
    flags = bots or [False] * len(nicknames)
    scores = personas or [None] * len(nicknames)
    player_ids: list[str] = []
    for nickname, is_bot, persona in zip(nicknames, flags, scores):
        player_id = str(uuid.uuid4())
        player = Player(player_id=player_id, nickname=nickname, is_bot=is_bot)
        # The board is generated from these, so a group arriving from a finished
        # 얼음땡 session plays a board made of what they actually did.
        player.persona = (
            persona_from_icebreaking(player_id, nickname, persona)
            if persona is not None
            else persona_provider.get_persona(player_id, nickname)
        )
        room.players[player_id] = player
        room.turn_order.append(player_id)
        player_ids.append(player_id)
    room.host_player_id = player_ids[host_index]
    store.create(room)
    return room.room_id, player_ids


def _new_room_id() -> str:
    for _ in range(20):
        code = generate_room_code()
        if not store.exists(code):
            return code
    raise MarbleHandoffError("방 코드를 생성하지 못했어요. 다시 시도해주세요")
