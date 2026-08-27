from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..constants import CATEGORY_FRAME, VALID_CATEGORIES
from ..database import get_db
from ..models.participant import Participant
from ..models.room import Room
from ..schemas.room import RoomCreateRequest, RoomResponse
from ..utils.room_code import generate_room_code

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomResponse)
def create_room(payload: RoomCreateRequest, db: Session = Depends(get_db)) -> Room:
    if payload.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="지원하지 않는 카테고리입니다")

    room = Room(
        code=generate_room_code(),
        category=payload.category,
        frame=CATEGORY_FRAME[payload.category],
    )
    db.add(room)
    db.flush()

    host = Participant(room_id=room.id, nickname=payload.host_nickname, is_host=True)
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
