from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.question import Question
from ..models.room import Room
from ..schemas.question import QuestionOut

router = APIRouter(prefix="/rooms/{code}/questions", tags=["questions"])


@router.get("", response_model=list[QuestionOut])
def list_questions(code: str, db: Session = Depends(get_db)) -> list[Question]:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return db.query(Question).filter(Question.room_id == room.id).order_by(Question.slot).all()
