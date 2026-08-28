from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..content.questions import IMPRESSION_QUESTION_NOS
from ..database import get_db
from ..models.guess import Guess
from ..models.player import Player
from ..models.room import Room
from ..schemas.impression import (
    ImpressionQuestionResult,
    ImpressionStatusResponse,
    ImpressionSubmitRequest,
    ImpressionTally,
)

router = APIRouter(prefix="/rooms/{code}/impressions/{round}", tags=["impressions"])

_KIND_BY_ROUND = {"pre": "IMPRESSION_PRE", "post": "IMPRESSION_POST"}
_NEXT_PHASE = {"pre": "ANSWER", "post": "TYPE_GUESS"}


def _get_room(code: str, db: Session) -> Room:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return room


def _kind(round: str) -> str:
    if round not in _KIND_BY_ROUND:
        raise HTTPException(status_code=404, detail="존재하지 않는 라운드입니다")
    return _KIND_BY_ROUND[round]


@router.post("", response_model=ImpressionStatusResponse)
def submit_impression(
    code: str, round: str, payload: ImpressionSubmitRequest, db: Session = Depends(get_db)
) -> ImpressionStatusResponse:
    kind = _kind(round)
    room = _get_room(code, db)

    if len(payload.votes) != len(IMPRESSION_QUESTION_NOS):
        raise HTTPException(status_code=400, detail="5문항을 모두 제출해야 합니다")

    # 재제출 시 이전 표를 지우고 새로 기록한다.
    db.query(Guess).filter(
        Guess.room_id == room.id, Guess.kind == kind, Guess.guesser_id == payload.player_id
    ).delete()
    for vote in payload.votes:
        db.add(
            Guess(
                room_id=room.id,
                kind=kind,
                guesser_id=payload.player_id,
                target_player_id=vote.target_player_id,
                round_no=vote.question_no,
            )
        )
    db.commit()

    submitted = (
        db.query(Guess.guesser_id)
        .filter(Guess.room_id == room.id, Guess.kind == kind)
        .distinct()
        .count()
    )
    if submitted == room.player_limit and room.phase == kind:
        room.phase = _NEXT_PHASE[round]
        db.commit()

    return _status(room, kind, db)


@router.get("/status", response_model=ImpressionStatusResponse)
def get_impression_status(code: str, round: str, db: Session = Depends(get_db)) -> ImpressionStatusResponse:
    kind = _kind(round)
    room = _get_room(code, db)
    return _status(room, kind, db)


def _status(room: Room, kind: str, db: Session) -> ImpressionStatusResponse:
    guesses = db.query(Guess).filter(Guess.room_id == room.id, Guess.kind == kind).all()
    submitted = len({g.guesser_id for g in guesses})
    revealed = submitted >= room.player_limit
    results = []
    if revealed:
        by_question: dict[int, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for g in guesses:
            by_question[g.round_no][g.target_player_id] += 1
        players = {p.id: p for p in db.query(Player).filter(Player.room_id == room.id).all()}
        for question_no in IMPRESSION_QUESTION_NOS:
            tally = [
                ImpressionTally(player_id=pid, nickname=players[pid].nickname if pid in players else "", votes=count)
                for pid, count in sorted(by_question[question_no].items(), key=lambda kv: -kv[1])
            ]
            results.append(ImpressionQuestionResult(question_no=question_no, tally=tally))
    return ImpressionStatusResponse(submitted=submitted, total=room.player_limit, revealed=revealed, results=results)
