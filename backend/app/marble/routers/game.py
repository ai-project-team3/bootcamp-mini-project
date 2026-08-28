from fastapi import APIRouter, HTTPException

from app.marble.game import engine
from app.marble.models.room import GamePhase
from app.marble.schemas.game import AnswerRequest, PlayerActionRequest
from app.marble.utils.deps import get_player_or_404, get_room_or_404

router = APIRouter(prefix="/marble/rooms", tags=["marble-game"])


@router.post("/{room_id}/start")
def start(room_id: str):
    room = get_room_or_404(room_id)
    if not room.is_full():
        raise HTTPException(
            400, f"{room.max_players}명이 모두 참가해야 시작할 수 있습니다"
        )
    try:
        engine.start_game(room)
    except engine.InvalidPhase as exc:
        raise HTTPException(400, str(exc))
    return {}


@router.post("/{room_id}/roll")
def roll(room_id: str, req: PlayerActionRequest):
    room = get_room_or_404(room_id)
    get_player_or_404(room, req.player_id)
    try:
        engine.roll_dice(room, req.player_id)
    except engine.NotYourTurn as exc:
        raise HTTPException(409, str(exc))
    except engine.InvalidPhase as exc:
        raise HTTPException(409, str(exc))
    return {}


@router.post("/{room_id}/answer")
def answer(room_id: str, req: AnswerRequest):
    room = get_room_or_404(room_id)
    get_player_or_404(room, req.player_id)
    try:
        engine.submit_answer(room, req.player_id, req.choice_index)
    except engine.NotYourTurn as exc:
        raise HTTPException(409, str(exc))
    except engine.InvalidPhase as exc:
        raise HTTPException(409, str(exc))
    return {}


@router.post("/{room_id}/forfeit-done")
def forfeit_done(room_id: str, req: PlayerActionRequest):
    """Acknowledge the dare (or the result blurb) and hand play on."""
    room = get_room_or_404(room_id)
    get_player_or_404(room, req.player_id)
    if room.phase is not GamePhase.SUBMIT_ANSWER:
        raise HTTPException(409, "Nothing to acknowledge")
    if room.current_player_id != req.player_id:
        raise HTTPException(409, "It is not your turn")
    engine.advance_turn(room)
    return {}


@router.post("/{room_id}/restart")
def restart(room_id: str):
    """Keep the room and its players, drop the finished game."""
    room = get_room_or_404(room_id)
    room.phase = GamePhase.WAITING
    room.board = []
    room.winner_id = None
    room.chemistry_summary = None
    room.current_player_id = None
    room.last_template_index = {}
    for player in room.players.values():
        player.position = 0
        player.score = 0
        player.steps_moved = 0
        player.active_benefit = None
        player.skip_next_turn = False
    room.last_dice_roll = None
    room.quiz = None
    room.pending_target_position = None
    room.last_answer_correct = None
    room.assigned_forfeit = None
    room.last_chance_card = None
    return {}
