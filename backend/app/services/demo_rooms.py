import random
import time
import uuid
from dataclasses import dataclass, field
from threading import Lock
from typing import Callable

from ..utils.room_code import generate_room_code

DEMO_ROOM_MIN_PLAYERS = 2
DEMO_ROOM_MAX_PLAYERS = 10


class DemoRoomError(Exception):
    pass


class DemoRoomNotFoundError(DemoRoomError):
    pass


class DemoRoomCapacityError(DemoRoomError):
    pass


class DemoRoomStartError(DemoRoomError):
    pass


class DemoRoomGameError(DemoRoomError):
    pass


class DemoRoomAuthorizationError(DemoRoomError):
    pass


class DemoRoomLaunchError(DemoRoomError):
    pass


#: Names for the seats the demo fills, in order.
#:
#: The first four are the people the party games in the shared room already
#: play with (`frontend/src/data/gameDemo/gameDemoData.js`), so a group that
#: carries on into 마피아 or 커플 브루마블 keeps the same faces instead of
#: watching 서준 and 유나 turn into 테스트봇1 and 테스트봇2 on the way in.
#: The rest continue the list far enough to fill the largest room.
TEST_BOT_NICKNAMES = ('서준', '유나', '지안', '다온', '하람', '시우', '나린', '도윤', '소율')


def bot_nickname_for(index: int) -> str:
    """The name for the `index`-th filled seat, counting from zero.

    Past the end of the roster the names repeat with a number, which only
    happens in rooms bigger than the list — never in a game that runs today.
    """
    name = TEST_BOT_NICKNAMES[index % len(TEST_BOT_NICKNAMES)]
    lap = index // len(TEST_BOT_NICKNAMES)
    return name if lap == 0 else f'{name}{lap + 1}'


#: How long apart the filled seats appear, in seconds.
#:
#: They are all created by one request, but a waiting room where four names
#: appear in the same instant does not read as people arriving — it reads as a
#: list being populated, which is what it is. Letting them in one at a time
#: over a few seconds gives the host the thing the waiting room is for:
#: watching the room fill up.
BOT_ARRIVAL_SECONDS = (1.0, 3.0)


@dataclass(frozen=True)
class DemoPlayer:
    id: str
    nickname: str
    seat_no: int
    is_host: bool
    is_bot: bool = False
    #: When this seat becomes visible to the room, as a `time.time()` moment.
    #: A person is here the moment they join; a filled seat walks in a little
    #: later so the room fills up rather than appearing all at once.
    arrives_at: float = 0.0

    def has_arrived(self, now: float) -> bool:
        return self.arrives_at <= now


@dataclass(frozen=True)
class DemoLaunch:
    """A game that runs its own room, started for everyone in this one.

    `player_ids` maps a shared-room player id to that same person's id inside
    the game's room. It never leaves the server as a whole — each player claims
    only their own entry — so knowing the room code is not enough to play as
    somebody else.
    """

    game_id: str
    room_id: str
    player_ids: dict[str, str]


@dataclass
class DemoRoom:
    code: str
    status: str = 'WAITING'
    players: list[DemoPlayer] = field(default_factory=list)
    selected_game_id: str | None = None
    game_phase: str = 'HUB'
    launch: DemoLaunch | None = None
    #: The 얼음땡 room this group came from, when they arrived from its report.
    #: The games use it to look up the abilities that session measured, matching
    #: people by nickname — see `services/persona_handoff`.
    source_room_code: str | None = None


def visible_players(room: DemoRoom, now: float | None = None) -> list[DemoPlayer]:
    """The seats the room currently shows, newest arrivals included.

    Filled seats walk in a few seconds apart, so this is what any client-facing
    count or roster must use. Capacity, starting and the handover to a game
    read `room.players` — every seat is really taken from the moment it is
    created, whether or not its occupant has appeared yet.
    """
    moment = time.time() if now is None else now
    return [player for player in room.players if player.has_arrived(moment)]


def demo_room_can_start(player_count: int) -> bool:
    return DEMO_ROOM_MIN_PLAYERS <= player_count <= DEMO_ROOM_MAX_PLAYERS


def demo_room_has_capacity(player_count: int) -> bool:
    return player_count < DEMO_ROOM_MAX_PLAYERS


class DemoRoomStore:
    def __init__(self, code_factory: Callable[[], str] = generate_room_code):
        self._code_factory = code_factory
        self._rooms: dict[str, DemoRoom] = {}
        self._lock = Lock()

    def create_room(
        self, nickname: str, source_room_code: str | None = None
    ) -> tuple[DemoRoom, DemoPlayer]:
        with self._lock:
            code = self._next_code()
            host = DemoPlayer(str(uuid.uuid4()), nickname.strip(), 1, True)
            room = DemoRoom(
                code=code,
                players=[host],
                source_room_code=(source_room_code or None),
            )
            self._rooms[code] = room
            return room, host

    def get_room(self, code: str) -> DemoRoom:
        with self._lock:
            return self._require_room(code)

    def list_players(self, code: str, now: float | None = None) -> list[DemoPlayer]:
        """The roster as the room currently shows it.

        Seats whose occupant has not walked in yet are held back, so a room
        filled with test bots fills up over a few seconds. Everything that has
        to count every seat — capacity, starting, handing the group to a game —
        reads `room.players` instead.
        """
        with self._lock:
            return visible_players(self._require_room(code), now)

    def join_room(self, code: str, nickname: str) -> DemoPlayer:
        with self._lock:
            room = self._require_room(code)
            if room.status != 'WAITING':
                raise DemoRoomStartError('이미 시작된 방입니다')
            if not demo_room_has_capacity(len(room.players)):
                raise DemoRoomCapacityError('게임 데모 방은 최대 10명까지 참가할 수 있습니다')
            player = DemoPlayer(str(uuid.uuid4()), nickname.strip(), len(room.players) + 1, False)
            room.players.append(player)
            return player

    def fill_test_players(self, code: str, player_id: str, count: int) -> DemoRoom:
        """Add seats nobody has to hold, so one person can test the whole flow.

        Demo-only. A real group arrives through the invite code; this exists
        because 마피아 needs four people before it will start and nobody has
        four phones to hand. The bots play themselves once a game begins — see
        `mafia/game/bots.py` and `marble/game/bots.py`.
        """
        with self._lock:
            room = self._require_room(code)
            if room.status != 'WAITING':
                raise DemoRoomStartError('대기실에서만 인원을 채울 수 있습니다')
            host = next((player for player in room.players if player.id == player_id), None)
            if host is None or not host.is_host:
                raise DemoRoomAuthorizationError('방장만 인원을 채울 수 있습니다')
            bot_number = sum(1 for player in room.players if player.is_bot)
            # They are seated now — capacity and the launch see them straight
            # away — but each walks in a little after the last, so the host
            # watches the room fill instead of it appearing already full.
            arrival = time.time()
            for _ in range(max(count, 0)):
                if not demo_room_has_capacity(len(room.players)):
                    break
                arrival += random.uniform(*BOT_ARRIVAL_SECONDS)
                room.players.append(DemoPlayer(
                    str(uuid.uuid4()),
                    bot_nickname_for(bot_number),
                    len(room.players) + 1,
                    False,
                    is_bot=True,
                    arrives_at=arrival,
                ))
                bot_number += 1
            return room

    def start_room(self, code: str, player_id: str) -> DemoRoom:
        with self._lock:
            room = self._require_room(code)
            if room.status != 'WAITING':
                raise DemoRoomStartError('이미 시작된 방입니다')
            host = next((player for player in room.players if player.id == player_id), None)
            if host is None or not host.is_host:
                raise DemoRoomAuthorizationError('방장만 시작할 수 있습니다')
            if not demo_room_can_start(len(room.players)):
                raise DemoRoomStartError('2명 이상 모이면 시작할 수 있습니다')
            room.status = 'IN_PROGRESS'
            return room

    def select_game(self, code: str, player_id: str, game_id: str) -> DemoRoom:
        with self._lock:
            room = self._require_room(code)
            self._require_host_in_progress(room, player_id)
            room.selected_game_id = game_id
            room.game_phase = 'GUIDE'
            return room

    def start_selected_game(self, code: str, player_id: str) -> DemoRoom:
        with self._lock:
            room = self._require_room(code)
            self._require_host_in_progress(room, player_id)
            if room.selected_game_id is None or room.game_phase != 'GUIDE':
                raise DemoRoomGameError('선택된 게임 설명서가 없습니다')
            room.game_phase = 'PLAYING'
            return room

    def launch_game(
        self,
        code: str,
        player_id: str,
        build: Callable[[list[DemoPlayer]], DemoLaunch],
    ) -> DemoRoom:
        """Start a game that keeps its own rooms, for everyone gathered here.

        The room is built while the lock is held so the roster cannot change
        between being read and being seated. `build` belongs to the caller: the
        shared room does not know how any particular game makes a room.
        """
        with self._lock:
            room = self._require_room(code)
            self._require_host_in_progress(room, player_id)
            launch = build(list(room.players))
            room.selected_game_id = launch.game_id
            room.game_phase = 'LAUNCHED'
            room.launch = launch
            return room

    def claim_launch(self, code: str, player_id: str) -> tuple[DemoLaunch, DemoPlayer]:
        """One player's own seat in the launched game.

        Everyone polls the room and sees that a game started; this is how each
        of them learns which player they are inside it, without ever being told
        anyone else's id.
        """
        with self._lock:
            room = self._require_room(code)
            if room.launch is None:
                raise DemoRoomLaunchError('아직 시작된 게임이 없습니다')
            player = next((item for item in room.players if item.id == player_id), None)
            if player is None:
                raise DemoRoomAuthorizationError('방 참가자만 게임에 들어갈 수 있습니다')
            if player_id not in room.launch.player_ids:
                raise DemoRoomLaunchError('게임이 시작된 뒤에 들어온 참가자입니다')
            return room.launch, player

    def return_to_hub(self, code: str, player_id: str) -> DemoRoom:
        """Put the room back on its game list without breaking it up.

        '게임 목록' means "we are done with this game", not "we are done": the
        room, its code and everyone in it stay exactly as they are, and the
        chooser opens again. Anyone in the room may do it — a game nobody is
        enjoying should not need the host to end it.
        """
        with self._lock:
            room = self._require_room(code)
            player = next((item for item in room.players if item.id == player_id), None)
            if player is None:
                raise DemoRoomAuthorizationError('방 참가자만 게임을 끝낼 수 있습니다')
            room.selected_game_id = None
            room.game_phase = 'HUB'
            room.launch = None
            return room

    def leave_room(self, code: str, player_id: str) -> bool:
        with self._lock:
            room = self._require_room(code)
            player = next((item for item in room.players if item.id == player_id), None)
            if player is None:
                raise DemoRoomAuthorizationError('방 참가자만 나갈 수 있습니다')
            if player.is_host:
                del self._rooms[code]
                return True
            room.players = [item for item in room.players if item.id != player_id]
            return False

    @staticmethod
    def _require_host_in_progress(room: DemoRoom, player_id: str) -> None:
        if room.status != 'IN_PROGRESS':
            raise DemoRoomGameError('방 게임을 먼저 시작해주세요')
        host = next((player for player in room.players if player.id == player_id), None)
        if host is None or not host.is_host:
            raise DemoRoomAuthorizationError('방장만 게임을 선택하거나 시작할 수 있습니다')

    def _require_room(self, code: str) -> DemoRoom:
        room = self._rooms.get(code)
        if room is None:
            raise DemoRoomNotFoundError('게임 데모 방을 찾을 수 없습니다')
        return room

    def _next_code(self) -> str:
        for _ in range(20):
            code = self._code_factory().upper()
            if code not in self._rooms:
                return code
        raise DemoRoomError('게임 데모 방 코드를 생성하지 못했습니다')
