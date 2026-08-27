from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..constants import CATEGORY_FRAME, VALID_CATEGORIES
from ..database import get_db
from ..models.participant import Participant
from ..models.room import Room
from ..models.user import User
from ..schemas.room import RoomCreateRequest, RoomResponse, RoomStartRequest
from ..utils.room_code import generate_room_code

router = APIRouter(prefix="/rooms", tags=["rooms"])

_CODE_ATTEMPTS = 8


@router.post("", response_model=RoomResponse)
def create_room(payload: RoomCreateRequest, db: Session = Depends(get_db)) -> Room:
    if payload.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="지원하지 않는 카테고리입니다")

    host = db.get(User, payload.user_id)
    if host is None:
        raise HTTPException(status_code=404, detail="계정을 찾을 수 없습니다")

    room = Room(
        code=_unique_code(db),
        category=payload.category,
        frame=CATEGORY_FRAME[payload.category],
    )
    db.add(room)
    db.flush()

    db.add(Participant(room_id=room.id, user_id=host.user_id, is_host=True))
    db.commit()
    db.refresh(room)
    return room


@router.get("/{code}", response_model=RoomResponse)
def get_room(code: str, db: Session = Depends(get_db)) -> Room:
    return require_room(db, code)


@router.post("/{code}/start", response_model=RoomResponse)
def start_room(code: str, payload: RoomStartRequest, db: Session = Depends(get_db)) -> Room:
    """Host-only. Everyone else is polling the room and follows the status change.

    Without this the non-host screens have no way to leave the waiting room —
    only the host would ever advance.
    """
    room = require_room(db, code)
    host = (
        db.query(Participant)
        .filter(
            Participant.room_id == room.id,
            Participant.user_id == payload.user_id,
            Participant.is_host.is_(True),
        )
        .first()
    )
    if host is None:
        raise HTTPException(status_code=403, detail="호스트만 시작할 수 있습니다")

    room.status = "IN_PROGRESS"
    db.commit()
    db.refresh(room)
    return room


def require_room(db: Session, code: str) -> Room:
    room = db.query(Room).filter(Room.code == code.upper()).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return room


def _unique_code(db: Session) -> str:
    """The code has to come from the server: two clients generating locally will
    eventually collide and land strangers in the same room."""
    for _ in range(_CODE_ATTEMPTS):
        code = generate_room_code()
        if db.query(Room).filter(Room.code == code).first() is None:
            return code
    raise HTTPException(status_code=503, detail="방 코드를 만들지 못했습니다. 다시 시도해 주세요")
