from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..data.survey_items import items_for
from ..database import get_db
from ..models.axis_score import AxisScore
from ..models.participant import Participant
from ..models.survey_response import SurveyResponse
from ..schemas.survey import (
    SurveyItemsResponse,
    SurveyStateResponse,
    SurveySubmitRequest,
    SurveySubmitResponse,
)
from ..scoring.survey import score_self
from .rooms import require_room

router = APIRouter(prefix="/rooms/{code}/survey", tags=["survey"])


@router.get("", response_model=SurveyItemsResponse)
def get_items(code: str, db: Session = Depends(get_db)) -> SurveyItemsResponse:
    room = require_room(db, code)
    items = items_for(room.category)
    if not items:
        raise HTTPException(status_code=503, detail="이 카테고리의 문항이 아직 준비되지 않았습니다")

    # Axis ids and choice values are deliberately dropped here. Plan doc §10-2.
    return SurveyItemsResponse(
        category=room.category,
        total=len(items),
        items=[
            {
                "id": item["id"],
                "text": item["text"],
                "choices": [{"key": c["key"], "text": c["text"]} for c in item["choices"]],
            }
            for item in items
        ],
    )


@router.post("", response_model=SurveySubmitResponse)
def submit(
    code: str, payload: SurveySubmitRequest, db: Session = Depends(get_db)
) -> SurveySubmitResponse:
    room = require_room(db, code)
    items = items_for(room.category)
    valid_ids = {item["id"] for item in items}

    accepted = 0
    for item_id, choice in payload.answers.items():
        if item_id not in valid_ids:
            continue
        row = db.get(SurveyResponse, (payload.user_id, room.id, item_id))
        if row is None:
            db.add(
                SurveyResponse(
                    user_id=payload.user_id,
                    session_id=room.id,
                    item_id=item_id,
                    choice=choice,
                )
            )
        else:
            row.choice = choice
        accepted += 1

    db.flush()

    stored = _answers_of(db, payload.user_id, room.id)
    complete = len(stored) >= len(items)
    if complete:
        _write_self_axes(db, payload.user_id, room, stored)

    db.commit()
    return SurveySubmitResponse(accepted=accepted, complete=complete)


@router.get("/state", response_model=SurveyStateResponse)
def state(code: str, db: Session = Depends(get_db)) -> SurveyStateResponse:
    """Polled every couple of seconds while people are still answering.

    `revealed` flips only when everyone in the room is done, which is what holds
    the simultaneous-reveal rule. Plan doc §10-5.
    """
    room = require_room(db, code)
    item_count = len(items_for(room.category))
    if item_count == 0:
        return SurveyStateResponse(submitted=0, total=0, revealed=False)

    user_ids = [
        row[0]
        for row in db.query(Participant.user_id).filter(Participant.room_id == room.id).all()
    ]
    submitted = sum(
        1 for user_id in user_ids if len(_answers_of(db, user_id, room.id)) >= item_count
    )
    total = len(user_ids)
    return SurveyStateResponse(
        submitted=submitted,
        total=total,
        revealed=total > 0 and submitted >= total,
    )


def _answers_of(db: Session, user_id: str, session_id: str) -> dict[str, str]:
    rows = (
        db.query(SurveyResponse)
        .filter(SurveyResponse.user_id == user_id, SurveyResponse.session_id == session_id)
        .all()
    )
    return {row.item_id: row.choice for row in rows}


def _write_self_axes(db: Session, user_id: str, room, answers: dict[str, str]) -> None:
    """Upsert SELF axis values. Plan doc §5-4 — the PK carries the category, so a
    TP reading never overwrites the same person's DY reading."""
    for result in score_self(room.category, answers):
        key = (user_id, room.category, result.axis_id, "SELF", room.id)
        row = db.get(AxisScore, key)
        if row is None:
            db.add(
                AxisScore(
                    user_id=user_id,
                    category=room.category,
                    axis_id=result.axis_id,
                    source="SELF",
                    session_id=room.id,
                    value=result.value,
                )
            )
        else:
            row.value = result.value
