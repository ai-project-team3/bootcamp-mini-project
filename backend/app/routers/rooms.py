from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from ..constants import MAX_PLAYERS, MIN_PLAYERS
from ..services.flow import first_phase
from ..database import get_db
from ..models.player import Player
from ..models.room import Room
from ..schemas.room import RegenerateQuestionsRequest, RoomCreateRequest, RoomResponse, RoomStartRequest
from ..services.question_gen import ensure_default_questions, generate_questions
from ..utils.room_code import generate_room_code

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomResponse)
def create_room(payload: RoomCreateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)) -> Room:
    if not (MIN_PLAYERS <= payload.player_limit <= MAX_PLAYERS):
        raise HTTPException(status_code=400, detail=f"인원은 {MIN_PLAYERS}~{MAX_PLAYERS}명 사이여야 합니다")

    room = Room(code=generate_room_code(), project_text=payload.project_text or None, player_limit=payload.player_limit)
    db.add(room)
    db.flush()

    host = Player(
        room_id=room.id,
        nickname=payload.nickname,
        gender=payload.gender,
        mbti=payload.mbti,
        seat_no=1,
        is_host=True,
    )
    db.add(host)
    db.commit()
    db.refresh(room)

    # §5-1: 기본 세트로 즉시 채워 대기 시간 없이 플레이 가능하게 하고, 실제 생성은
    # 참가자가 모이는 동안 백그라운드로 돌린다.
    ensure_default_questions(db, room.id)
    background_tasks.add_task(generate_questions, room.id, payload.project_text)

    return room


@router.get("/{code}", response_model=RoomResponse)
def get_room(code: str, db: Session = Depends(get_db)) -> Room:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return room


@router.post("/{code}/start", response_model=RoomResponse)
def start_room(code: str, payload: RoomStartRequest, db: Session = Depends(get_db)) -> Room:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    if room.status != "WAITING":
        raise HTTPException(status_code=400, detail="이미 시작된 방입니다")

    host = db.query(Player).filter(Player.id == payload.player_id, Player.room_id == room.id).first()
    if host is None or not host.is_host:
        raise HTTPException(status_code=403, detail="호스트만 시작할 수 있습니다")

    player_count = db.query(Player).filter(Player.room_id == room.id).count()
    if player_count != room.player_limit:
        raise HTTPException(status_code=400, detail=f"{room.player_limit}명이 모여야 시작할 수 있습니다")

    room.status = "IN_PROGRESS"
    room.phase = first_phase(player_count)
    db.commit()
    db.refresh(room)
    return room


@router.post("/{code}/regenerate-questions", response_model=RoomResponse)
def regenerate_questions(code: str, payload: RegenerateQuestionsRequest, db: Session = Depends(get_db)) -> Room:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    if room.status != "WAITING":
        raise HTTPException(status_code=400, detail="이미 시작된 방입니다")

    host = db.query(Player).filter(Player.id == payload.player_id, Player.room_id == room.id).first()
    if host is None or not host.is_host:
        raise HTTPException(status_code=403, detail="호스트만 다시 만들 수 있습니다")

    # §5-8: 내용은 안 보고 다시 돌리는 것만 가능 — 완료까지 기다렸다가 결과를 반환한다.
    generate_questions(room.id, room.project_text or "")
    db.refresh(room)
    return room
