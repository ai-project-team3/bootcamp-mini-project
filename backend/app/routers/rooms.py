from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..constants import MAX_PLAYERS
from ..database import get_db
from ..models.player import Player
from ..models.room import Room
from ..schemas.room import RoomCreateRequest, RoomResponse, RoomStartRequest
from ..utils.room_code import generate_room_code

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomResponse)
def create_room(payload: RoomCreateRequest, db: Session = Depends(get_db)) -> Room:
    room = Room(code=generate_room_code())
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
    if player_count != MAX_PLAYERS:
        raise HTTPException(status_code=400, detail=f"{MAX_PLAYERS}명이 모여야 시작할 수 있습니다")

    room.status = "IN_PROGRESS"
    room.phase = "IMPRESSION_PRE"
    db.commit()
    db.refresh(room)
    return room
