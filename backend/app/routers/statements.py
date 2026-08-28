from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..constants import MAX_PLAYERS, STATEMENT_MAX_LEN
from ..database import get_db
from ..models.guess import Guess
from ..models.player import Player
from ..models.room import Room
from ..models.statement import Statement
from ..schemas.statement import (
    GuessOut,
    LieGuessRequest,
    StatementOut,
    StatementsProgressResponse,
    StatementsSubmitRequest,
    TurnResponse,
)

router = APIRouter(prefix="/rooms/{code}/statements", tags=["statements"])


def _get_room(code: str, db: Session) -> Room:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return room


@router.post("", response_model=StatementsProgressResponse)
def submit_statements(code: str, payload: StatementsSubmitRequest, db: Session = Depends(get_db)) -> StatementsProgressResponse:
    room = _get_room(code, db)

    slots = sorted(s.slot for s in payload.statements)
    lie_count = sum(1 for s in payload.statements if s.is_lie)
    if slots != [1, 2, 3] or lie_count != 1:
        raise HTTPException(status_code=400, detail="세 줄 중 정확히 하나만 거짓이어야 합니다")
    if any(len(s.text) > STATEMENT_MAX_LEN for s in payload.statements):
        raise HTTPException(status_code=400, detail=f"한 줄은 {STATEMENT_MAX_LEN}자를 넘을 수 없습니다")

    db.query(Statement).filter(Statement.room_id == room.id, Statement.player_id == payload.player_id).delete()
    for s in payload.statements:
        db.add(Statement(room_id=room.id, player_id=payload.player_id, slot=s.slot, text=s.text, is_lie=s.is_lie))
    db.commit()

    return _progress(room.id, db)


@router.get("/progress", response_model=StatementsProgressResponse)
def get_progress(code: str, db: Session = Depends(get_db)) -> StatementsProgressResponse:
    room = _get_room(code, db)
    return _progress(room.id, db)


def _progress(room_id: str, db: Session) -> StatementsProgressResponse:
    submitted = (
        db.query(Statement.player_id).filter(Statement.room_id == room_id).distinct().count()
    )
    return StatementsProgressResponse(submitted=submitted, total=MAX_PLAYERS)


@router.get("/turn", response_model=TurnResponse)
def get_turn(code: str, db: Session = Depends(get_db)) -> TurnResponse:
    room = _get_room(code, db)
    progress = _progress(room.id, db)
    if progress.submitted < MAX_PLAYERS:
        return TurnResponse(done=False, target_player_id=None)

    players = db.query(Player).filter(Player.room_id == room.id).order_by(Player.seat_no).all()
    for target in players:
        guess_count = (
            db.query(Guess.guesser_id)
            .filter(Guess.room_id == room.id, Guess.kind == "LIE", Guess.target_player_id == target.id)
            .distinct()
            .count()
        )
        if guess_count < MAX_PLAYERS - 1:
            statements = (
                db.query(Statement)
                .filter(Statement.room_id == room.id, Statement.player_id == target.id)
                .order_by(Statement.slot)
                .all()
            )
            return TurnResponse(
                done=False,
                target_player_id=target.id,
                nickname=target.nickname,
                statements=[StatementOut(slot=s.slot, text=s.text) for s in statements],
                submitted=guess_count,
                total=MAX_PLAYERS - 1,
                revealed=False,
            )

    # 전원 턴 종료 — 마지막 대상자 기준으로 최종 공개 정보를 채워 반환.
    last = players[-1]
    statements = (
        db.query(Statement).filter(Statement.room_id == room.id, Statement.player_id == last.id).order_by(Statement.slot).all()
    )
    return _revealed_turn(room, last, statements, db, done=True)


def _revealed_turn(room: Room, target: Player, statements: list[Statement], db: Session, done: bool) -> TurnResponse:
    correct_slot = next((s.slot for s in statements if s.is_lie), None)
    guesses = db.query(Guess).filter(
        Guess.room_id == room.id, Guess.kind == "LIE", Guess.target_player_id == target.id
    ).all()
    guess_outs = []
    for g in guesses:
        guesser = db.get(Player, g.guesser_id)
        stmt = db.get(Statement, g.target_statement_id) if g.target_statement_id else None
        guess_outs.append(
            GuessOut(guesser_nickname=guesser.nickname if guesser else "", guessed_slot=stmt.slot if stmt else 0)
        )
    return TurnResponse(
        done=done,
        target_player_id=target.id,
        nickname=target.nickname,
        statements=[StatementOut(slot=s.slot, text=s.text) for s in statements],
        submitted=len(guesses),
        total=MAX_PLAYERS - 1,
        revealed=True,
        correct_slot=correct_slot,
        guesses=guess_outs,
    )


@router.post("/{target_player_id}/guess", response_model=TurnResponse)
def submit_lie_guess(
    code: str, target_player_id: str, payload: LieGuessRequest, db: Session = Depends(get_db)
) -> TurnResponse:
    room = _get_room(code, db)
    if payload.guesser_id == target_player_id:
        raise HTTPException(status_code=400, detail="본인 차례에는 추측할 수 없습니다")

    target_statement = (
        db.query(Statement)
        .filter(Statement.room_id == room.id, Statement.player_id == target_player_id, Statement.slot == payload.guessed_slot)
        .first()
    )
    if target_statement is None:
        raise HTTPException(status_code=404, detail="해당 문장을 찾을 수 없습니다")

    existing = db.query(Guess).filter(
        Guess.room_id == room.id,
        Guess.kind == "LIE",
        Guess.guesser_id == payload.guesser_id,
        Guess.target_player_id == target_player_id,
    ).first()
    if existing is None:
        db.add(
            Guess(
                room_id=room.id,
                kind="LIE",
                guesser_id=payload.guesser_id,
                target_player_id=target_player_id,
                target_statement_id=target_statement.id,
            )
        )
    else:
        existing.target_statement_id = target_statement.id
    db.commit()

    target = db.get(Player, target_player_id)
    statements = (
        db.query(Statement).filter(Statement.room_id == room.id, Statement.player_id == target_player_id).order_by(Statement.slot).all()
    )
    guess_count = (
        db.query(Guess.guesser_id)
        .filter(Guess.room_id == room.id, Guess.kind == "LIE", Guess.target_player_id == target_player_id)
        .distinct()
        .count()
    )
    revealed = guess_count >= MAX_PLAYERS - 1

    if revealed:
        # 전체 진행 상황을 확인해 마지막 대상자였다면 다음 단계로 자동 전이.
        total_lie_guesses = db.query(Guess).filter(Guess.room_id == room.id, Guess.kind == "LIE").count()
        if total_lie_guesses == MAX_PLAYERS * (MAX_PLAYERS - 1) and room.phase == "STATEMENT":
            room.phase = "IMPRESSION_POST"
            db.commit()
        return _revealed_turn(room, target, statements, db, done=False)

    return TurnResponse(
        done=False,
        target_player_id=target.id,
        nickname=target.nickname,
        statements=[StatementOut(slot=s.slot, text=s.text) for s in statements],
        submitted=guess_count,
        total=MAX_PLAYERS - 1,
        revealed=False,
    )
