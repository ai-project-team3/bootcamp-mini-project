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


@dataclass(frozen=True)
class DemoPlayer:
    id: str
    nickname: str
    seat_no: int
    is_host: bool


@dataclass
class DemoRoom:
    code: str
    status: str = 'WAITING'
    players: list[DemoPlayer] = field(default_factory=list)
    selected_game_id: str | None = None
    game_phase: str = 'HUB'


def demo_room_can_start(player_count: int) -> bool:
    return DEMO_ROOM_MIN_PLAYERS <= player_count <= DEMO_ROOM_MAX_PLAYERS


def demo_room_has_capacity(player_count: int) -> bool:
    return player_count < DEMO_ROOM_MAX_PLAYERS


class DemoRoomStore:
    def __init__(self, code_factory: Callable[[], str] = generate_room_code):
        self._code_factory = code_factory
        self._rooms: dict[str, DemoRoom] = {}
        self._lock = Lock()

    def create_room(self, nickname: str) -> tuple[DemoRoom, DemoPlayer]:
        with self._lock:
            code = self._next_code()
            host = DemoPlayer(str(uuid.uuid4()), nickname.strip(), 1, True)
            room = DemoRoom(code=code, players=[host])
            self._rooms[code] = room
            return room, host

    def get_room(self, code: str) -> DemoRoom:
        with self._lock:
            return self._require_room(code)

    def list_players(self, code: str) -> list[DemoPlayer]:
        with self._lock:
            return list(self._require_room(code).players)

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
