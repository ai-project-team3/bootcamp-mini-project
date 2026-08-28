import uuid

from fastapi import APIRouter, HTTPException

from app.marble.models.room import ContentMode, GamePhase, Player, Room
from app.marble.persona.provider import MockPersonaProvider
from app.marble.schemas.room import CreateRoomRequest, JoinRoomRequest
from app.marble.store import store
from app.marble.utils.deps import get_room_or_404
from app.marble.utils.room_code import generate_room_code

router = APIRouter(prefix="/marble/rooms", tags=["marble-rooms"])

MAX_NICKNAME_LENGTH = 12

# TODO: 실제 페르소나 API 연동 시 이 provider 만 교체하면 된다.
persona_provider = MockPersonaProvider()


def _new_room_id() -> str:
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


def serialize_room(room: Room) -> dict:
    """Public room state.

    The quiz is deliberately serialised without `correct_index` — the opponent
    polls this same endpoint and would otherwise see the answer.
    """
    quiz = None
    if room.quiz is not None:
        quiz = {
            "tile_type": room.quiz.tile_type.value,
            "question": room.quiz.question,
            "choices": room.quiz.choices,
        }

    card = None
    if room.last_chance_card is not None:
        card = {
            "kind": room.last_chance_card.kind,
            "benefit": room.last_chance_card.benefit.value if room.last_chance_card.benefit else None,
        }

    return {
        "room_id": room.room_id,
        "phase": room.phase.value,
        "content_mode": room.content_mode.value,
        "board": [{"index": t.index, "type": t.type.value} for t in room.board],
        "players": [
            {
                "player_id": p.player_id,
                "nickname": p.nickname,
                "position": p.position,
                "score": p.score,
                "steps_moved": p.steps_moved,
                "active_benefit": p.active_benefit.value if p.active_benefit else None,
                "skip_next_turn": p.skip_next_turn,
            }
            for p in (room.players[pid] for pid in room.turn_order)
        ],
        "host_player_id": room.host_player_id,
        "current_player_id": room.current_player_id,
        "last_dice_roll": room.last_dice_roll,
        "quiz": quiz,
        "last_answer_correct": room.last_answer_correct,
        "assigned_forfeit": room.assigned_forfeit,
        "last_chance_card": card,
        "winner_id": room.winner_id,
        "chemistry_summary": room.chemistry_summary,
        "board_size": len(room.board),
    }


@router.post("")
def create_room(req: CreateRoomRequest):
    room_id = _new_room_id()
    store.create(Room(room_id=room_id, content_mode=ContentMode(req.content_mode)))
    return {"room_id": room_id}


@router.post("/{room_id}/join")
def join_room(room_id: str, req: JoinRoomRequest):
    room = get_room_or_404(room_id)
    if room.phase is not GamePhase.WAITING:
        raise HTTPException(400, "이미 시작된 게임에는 참가할 수 없습니다")
    if room.is_full():
        raise HTTPException(400, "Room is full")

    nickname = _clean_nickname(req.nickname)
    player_id = str(uuid.uuid4())
    player = Player(player_id=player_id, nickname=nickname)
    player.persona = persona_provider.get_persona(player_id, nickname)

    room.players[player_id] = player
    room.turn_order.append(player_id)
    if room.host_player_id is None:
        room.host_player_id = player_id

    return {"player_id": player_id, "is_host": room.host_player_id == player_id}


@router.get("/{room_id}/state")
def get_state(room_id: str):
    return serialize_room(get_room_or_404(room_id))
