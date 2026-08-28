from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..content.questions import EITHER_OR_QUESTION_NOS
from ..database import get_db
from ..models.answer import Answer
from ..models.player import Player
from ..models.room import Room
from ..schemas.answer import AnswerResult, AnswerStatusResponse, AnswerSubmitRequest

router = APIRouter(prefix="/rooms/{code}/answers", tags=["answers"])


def _get_room(code: str, db: Session) -> Room:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return room


@router.post("/{question_no}", response_model=AnswerStatusResponse)
def submit_answer(
    code: str, question_no: int, payload: AnswerSubmitRequest, db: Session = Depends(get_db)
) -> AnswerStatusResponse:
    if question_no not in EITHER_OR_QUESTION_NOS:
        raise HTTPException(status_code=400, detail="존재하지 않는 문항입니다")
    room = _get_room(code, db)

    existing = (
        db.query(Answer)
        .filter(Answer.room_id == room.id, Answer.player_id == payload.player_id, Answer.question_no == question_no)
        .first()
    )
    if existing is None:
        db.add(
            Answer(
                room_id=room.id,
                player_id=payload.player_id,
                question_no=question_no,
                choice=payload.choice,
                elapsed_ms=payload.elapsed_ms,
            )
        )
    else:
        existing.choice = payload.choice
        existing.elapsed_ms = payload.elapsed_ms
    db.commit()

    # 마지막 문항까지 전원(정원×8문항) 제출되면 자동으로 다음 단계로 전이.
    if question_no == max(EITHER_OR_QUESTION_NOS):
        total_answers = db.query(Answer).filter(Answer.room_id == room.id).count()
        if total_answers == room.player_limit * len(EITHER_OR_QUESTION_NOS) and room.phase == "ANSWER":
            room.phase = "STATEMENT"
            db.commit()

    return _status(room, question_no, db)


@router.get("/{question_no}/status", response_model=AnswerStatusResponse)
def get_answer_status(code: str, question_no: int, db: Session = Depends(get_db)) -> AnswerStatusResponse:
    room = _get_room(code, db)
    return _status(room, question_no, db)


def _status(room: Room, question_no: int, db: Session) -> AnswerStatusResponse:
    answers = db.query(Answer).filter(Answer.room_id == room.id, Answer.question_no == question_no).all()
    revealed = len(answers) >= room.player_limit
    results = []
    if revealed:
        for a in answers:
            player = db.get(Player, a.player_id)
            results.append(AnswerResult(player_id=a.player_id, nickname=player.nickname if player else "", choice=a.choice))
    return AnswerStatusResponse(
        question_no=question_no, submitted=len(answers), total=room.player_limit, revealed=revealed, results=results
    )
