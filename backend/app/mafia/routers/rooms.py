import uuid

from fastapi import APIRouter, HTTPException

from app.mafia.constants import ALLOWED_PLAYER_COUNTS, TEST_BOT_NICKNAME_PREFIX
from app.mafia.game import state_machine
from app.mafia.models.room import GamePhase, Player, Room
from app.mafia.schemas.room import (
    CreateRoomRequest,
    JoinRoomRequest,
    UpdatePlayerCountRequest,
)
from app.mafia.store import store
from app.mafia.utils.deps import get_room_or_404
from app.mafia.utils.room_code import generate_room_code

router = APIRouter(prefix="/mafia/rooms", tags=["mafia-rooms"])

MAX_NICKNAME_LENGTH = 12


def _player_count_error() -> str:
    allowed = ", ".join(str(n) for n in ALLOWED_PLAYER_COUNTS)
    return f"player_count must be one of: {allowed}"


def _new_room_id() -> str:
    """A short code players can read aloud. Retry on the rare collision."""
    for _ in range(20):
        code = generate_room_code()
        if not store.exists(code):
            return code
    raise HTTPException(503, "방 코드를 생성하지 못했습니다. 다시 시도해주세요")


def _clean_nickname(raw: str) -> str:
    nickname = raw.strip()
    if not nickname:
        raise HTTPException(400, "닉네임을 입력해주세요")
    if len(nickname) > MAX_NICKNAME_LENGTH:
        raise HTTPException(400, f"닉네임은 {MAX_NICKNAME_LENGTH}자 이하로 입력해주세요")
    return nickname


@router.post("")
def create_room(req: CreateRoomRequest):
    if req.player_count not in ALLOWED_PLAYER_COUNTS:
        raise HTTPException(400, _player_count_error())
    room_id = _new_room_id()
    store.create(Room(room_id=room_id, player_count=req.player_count))
    return {"room_id": room_id}


@router.post("/{room_id}/join")
def join_room(room_id: str, req: JoinRoomRequest):
    room = get_room_or_404(room_id)
    if room.phase != GamePhase.WAITING_ROOM:
        raise HTTPException(400, "이미 시작된 게임에는 참가할 수 없습니다")
    if len(room.players) >= room.player_count:
        raise HTTPException(400, "Room is full")
    nickname = _clean_nickname(req.nickname)
    player_id = str(uuid.uuid4())
    room.players[player_id] = Player(player_id=player_id, nickname=nickname)
    if room.host_player_id is None:
        room.host_player_id = player_id
    return {"player_id": player_id, "is_host": room.host_player_id == player_id}


@router.post("/{room_id}/player-count")
def update_player_count(room_id: str, req: UpdatePlayerCountRequest):
    room = get_room_or_404(room_id)
    if room.phase != GamePhase.WAITING_ROOM:
        raise HTTPException(400, "대기실에서만 인원수를 변경할 수 있습니다")
    if req.player_count not in ALLOWED_PLAYER_COUNTS:
        raise HTTPException(400, _player_count_error())
    if req.player_count < len(room.players):
        raise HTTPException(400, "이미 참가한 인원보다 적게 설정할 수 없습니다")
    room.player_count = req.player_count
    return {"player_count": room.player_count}


@router.post("/{room_id}/fill-test-players")
def fill_test_players(room_id: str):
    """혼자서 전체 플레이를 테스트할 수 있도록 부족한 인원을 테스트봇으로
    채우는 개발/데모 전용 엔드포인트. 실제 서비스에서는 사용하지 않는다 —
    실제 인원은 QR/방 코드로 각자 들어온다."""
    room = get_room_or_404(room_id)
    if room.phase != GamePhase.WAITING_ROOM:
        raise HTTPException(400, "대기실에서만 인원을 채울 수 있습니다")
    bot_index = 1
    while len(room.players) < room.player_count:
        player_id = str(uuid.uuid4())
        room.players[player_id] = Player(
            player_id=player_id,
            nickname=f"{TEST_BOT_NICKNAME_PREFIX}{bot_index}",
        )
        if room.host_player_id is None:
            room.host_player_id = player_id
        bot_index += 1
    return {"status": "ok", "player_count": len(room.players)}


@router.get("/{room_id}/state")
def get_state(room_id: str):
    room = get_room_or_404(room_id)
    try:
        state_machine.tick(room)
    except state_machine.InvalidPhaseTransition:
        # 락이 없는 인메모리 스토어에서 여러 탭이 동시에 폴링하다 마감 시각이
        # 지난 순간을 함께 맞으면, 한쪽 요청이 전이를 완료한 직후 다른 쪽
        # 요청이 이미 낡아버린 전이 함수를 호출해 여기서 예외가 발생할 수
        # 있다. 이미 다른 요청이 진행시켜 놓았으니 이번 요청은 할 일이 없다.
        pass
    return {
        "phase": room.phase.value,
        "day_number": room.day_number,
        "night_number": room.night_number,
        "host_player_id": room.host_player_id,
        "player_count": room.player_count,
        "personas_ready": len(room.personas) == room.player_count,
        "phase_deadline": room.phase_deadline,
        "accused_player_id": room.accused_player_id,
        "night_summary": room.night_summary,
        "execution_result": room.execution_result,
        "players": [
            {"player_id": p.player_id, "nickname": p.nickname, "is_alive": p.is_alive}
            for p in room.players.values()
        ],
    }


@router.get("/{room_id}/result")
def get_result(room_id: str):
    room = get_room_or_404(room_id)
    if room.phase != GamePhase.RESULT:
        raise HTTPException(400, "Result is only available after the game ends")
    return {
        "winner": room.winner,
        "players": [
            {
                "player_id": p.player_id,
                "nickname": p.nickname,
                "role": p.role,
                "is_alive": p.is_alive,
                "assigned_score": p.assigned_score,
                "assigned_by": p.assigned_by,
                "persona_scores": {
                    "initiative": room.personas[p.player_id].initiative,
                    "analysis": room.personas[p.player_id].analysis,
                    "empathy": room.personas[p.player_id].empathy,
                    "caution": room.personas[p.player_id].caution,
                },
            }
            for p in room.players.values()
        ],
    }
