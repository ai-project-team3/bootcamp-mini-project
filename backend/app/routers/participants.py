from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..constants import FRAME_MAX_PARTICIPANTS
from ..database import get_db
from ..models.participant import Participant
from ..models.room import Room
from ..schemas.participant import ParticipantJoinRequest, ParticipantResponse

router = APIRouter(prefix="/rooms/{code}/participants", tags=["participants"])


@router.get("", response_model=list[ParticipantResponse])
def list_participants(code: str, db: Session = Depends(get_db)) -> list[Participant]:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return (
        db.query(Participant)
        .filter(Participant.room_id == room.id)
        .order_by(Participant.joined_at)
        .all()
    )


@router.post("", response_model=ParticipantResponse)
def join_room(
    code: str, payload: ParticipantJoinRequest, db: Session = Depends(get_db)
) -> Participant:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    if room.status != "WAITING":
        raise HTTPException(status_code=400, detail="이미 시작된 방입니다")

    current_count = db.query(Participant).filter(Participant.room_id == room.id).count()
    if current_count >= FRAME_MAX_PARTICIPANTS[room.frame]:
        raise HTTPException(status_code=400, detail="정원이 가득 찼습니다")

    participant = Participant(room_id=room.id, nickname=payload.nickname, is_host=False)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant
