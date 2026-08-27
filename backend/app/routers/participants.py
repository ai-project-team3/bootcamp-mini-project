from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.participant import Participant
from ..models.user import User
from ..schemas.participant import ParticipantJoinRequest, ParticipantResponse
from .rooms import require_room

router = APIRouter(prefix="/rooms/{code}/participants", tags=["participants"])


@router.get("", response_model=list[ParticipantResponse])
def list_participants(code: str, db: Session = Depends(get_db)) -> list[ParticipantResponse]:
    room = require_room(db, code)
    rows = (
        db.query(Participant, User)
        .join(User, User.user_id == Participant.user_id)
        .filter(Participant.room_id == room.id)
        .order_by(Participant.joined_at)
        .all()
    )
    return [_to_response(participant, user) for participant, user in rows]


@router.post("", response_model=ParticipantResponse)
def join_room(
    code: str, payload: ParticipantJoinRequest, db: Session = Depends(get_db)
) -> ParticipantResponse:
    room = require_room(db, code)
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="계정을 찾을 수 없습니다")

    existing = (
        db.query(Participant)
        .filter(Participant.room_id == room.id, Participant.user_id == user.user_id)
        .first()
    )
    if existing is not None:
        # Rejoining after a refresh or a dropped connection is the normal path,
        # not an error. Plan doc §15.
        return _to_response(existing, user)

    participant = Participant(room_id=room.id, user_id=user.user_id, is_host=False)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return _to_response(participant, user)


def _to_response(participant: Participant, user: User) -> ParticipantResponse:
    return ParticipantResponse(
        id=participant.id,
        user_id=participant.user_id,
        room_id=participant.room_id,
        nickname=user.nickname or "익명",
        is_host=participant.is_host,
    )
