from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..constants import TYPES
from ..database import get_db
from ..models.guess import Guess
from ..models.player import Player
from ..models.room import Room
from ..schemas.type_guess import (
    AssignRequest,
    AssignResultEntry,
    CardOut,
    SelfGuessRequest,
    SelfStatusResponse,
    TypeGuessStatusResponse,
)
from ..services.scoring import compute_behavior_abilities, compute_half_obs, compute_lie_correct_counts, determine_type

router = APIRouter(prefix="/rooms/{code}/type-guess", tags=["type-guess"])


def _get_room(code: str, db: Session) -> Room:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return room


def _players(room_id: str, db: Session) -> list[Player]:
    return db.query(Player).filter(Player.room_id == room_id).order_by(Player.seat_no).all()


def _provisional_types(db: Session, room: Room, players: list[Player]) -> dict[str, str]:
    """카드 노출 시점의 유형(관찰력은 거짓 찾기 결과만 반영한 절반 값)."""
    abilities = compute_behavior_abilities(db, room.id, players)
    lie_correct = compute_lie_correct_counts(db, room.id)
    types = {}
    for p in players:
        a = abilities[p.id]
        obs_half = compute_half_obs(lie_correct, p.id, len(players))
        types[p.id] = determine_type(a["DOM"], a["EXP"], obs_half, a["SPD"])
    return types


@router.post("/self", response_model=SelfStatusResponse)
def submit_self_guess(code: str, payload: SelfGuessRequest, db: Session = Depends(get_db)) -> SelfStatusResponse:
    room = _get_room(code, db)
    if payload.type_code not in TYPES:
        raise HTTPException(status_code=400, detail="존재하지 않는 유형입니다")

    existing = db.query(Guess).filter(
        Guess.room_id == room.id,
        Guess.kind == "TYPE",
        Guess.guesser_id == payload.player_id,
        Guess.target_player_id == payload.player_id,
    ).first()
    if existing is None:
        db.add(
            Guess(
                room_id=room.id,
                kind="TYPE",
                guesser_id=payload.player_id,
                target_player_id=payload.player_id,
                target_type_code=payload.type_code,
            )
        )
    else:
        existing.target_type_code = payload.type_code
    db.commit()
    return _self_status(room, db)


@router.get("/self-status", response_model=SelfStatusResponse)
def get_self_status(code: str, db: Session = Depends(get_db)) -> SelfStatusResponse:
    room = _get_room(code, db)
    return _self_status(room, db)


def _self_status(room: Room, db: Session) -> SelfStatusResponse:
    guesses = db.query(Guess).filter(Guess.room_id == room.id, Guess.kind == "TYPE").all()
    submitted = sum(1 for g in guesses if g.guesser_id == g.target_player_id)
    return SelfStatusResponse(submitted=submitted, total=room.player_limit, revealed=submitted >= room.player_limit)


@router.get("/cards", response_model=list[CardOut])
def get_cards(code: str, player_id: str = Query(...), db: Session = Depends(get_db)) -> list[CardOut]:
    room = _get_room(code, db)
    if not _self_status(room, db).revealed:
        raise HTTPException(status_code=400, detail="아직 전원이 자기 유형을 찍지 않았습니다")

    players = _players(room.id, db)
    types = _provisional_types(db, room, players)
    others = [p for p in players if p.id != player_id]
    # player_id 자체가 무작위성을 갖는 UUID이므로 정렬만으로도 매 호출 안정적인
    # 의사 랜덤 순서가 나온다(추가 상태 저장 없이 카드 순서 고정).
    others_sorted = sorted(others, key=lambda p: p.id)
    cards = []
    for p in others_sorted:
        spec = TYPES[types[p.id]]
        cards.append(
            CardOut(
                card_id=p.id,
                type_code=types[p.id],
                name=spec["name"],
                subtitle=spec["subtitle"],
                color=spec["color"],
                symbol=spec["symbol"],
            )
        )
    return cards


@router.post("/assign", response_model=TypeGuessStatusResponse)
def submit_assignment(code: str, payload: AssignRequest, db: Session = Depends(get_db)) -> TypeGuessStatusResponse:
    room = _get_room(code, db)
    players = _players(room.id, db)
    seat_by_player = {p.id: p.seat_no for p in players}
    other_ids = {p.id for p in players if p.id != payload.player_id}

    if len(payload.assignments) != len(other_ids):
        raise HTTPException(status_code=400, detail=f"{len(other_ids)}장을 모두 배정해야 합니다")
    card_ids = {a.card_id for a in payload.assignments}
    target_ids = {a.target_player_id for a in payload.assignments}
    if card_ids != other_ids or target_ids != other_ids:
        raise HTTPException(status_code=400, detail="배정이 올바르지 않습니다")

    types = _provisional_types(db, room, players)

    db.query(Guess).filter(
        Guess.room_id == room.id,
        Guess.kind == "TYPE",
        Guess.guesser_id == payload.player_id,
        Guess.round_no.isnot(None),
    ).delete()
    for a in payload.assignments:
        db.add(
            Guess(
                room_id=room.id,
                kind="TYPE",
                guesser_id=payload.player_id,
                target_player_id=a.target_player_id,
                target_type_code=types[a.card_id],
                round_no=seat_by_player[a.card_id],
            )
        )
    db.commit()

    status = _assign_status(room, db, players)
    if status.revealed and room.phase == "TYPE_GUESS":
        room.status = "DONE"
        room.phase = "DONE"
        db.commit()
    return status


@router.get("/status", response_model=TypeGuessStatusResponse)
def get_status(code: str, db: Session = Depends(get_db)) -> TypeGuessStatusResponse:
    room = _get_room(code, db)
    players = _players(room.id, db)
    return _assign_status(room, db, players)


def _assign_status(room: Room, db: Session, players: list[Player]) -> TypeGuessStatusResponse:
    seat_by_player = {p.id: p.seat_no for p in players}
    nickname_by_player = {p.id: p.nickname for p in players}
    guesses = (
        db.query(Guess)
        .filter(Guess.room_id == room.id, Guess.kind == "TYPE", Guess.round_no.isnot(None))
        .all()
    )
    by_guesser: dict[str, int] = {}
    for g in guesses:
        by_guesser[g.guesser_id] = by_guesser.get(g.guesser_id, 0) + 1
    others_count = len(players) - 1
    if others_count <= 0:
        # 혼자면 배정할 카드가 없어 by_guesser가 영영 비어 있다. 자기 유형
        # 예측을 낸 것으로 이 단계가 끝난 것으로 본다.
        submitted = (
            db.query(Guess)
            .filter(Guess.room_id == room.id, Guess.kind == "TYPE", Guess.round_no.is_(None))
            .count()
        )
    else:
        submitted = sum(1 for count in by_guesser.values() if count == others_count)
    revealed = submitted >= room.player_limit

    results = []
    if revealed:
        for g in guesses:
            correct = seat_by_player.get(g.target_player_id) == g.round_no
            results.append(
                AssignResultEntry(
                    guesser_nickname=nickname_by_player.get(g.guesser_id, ""),
                    target_player_id=g.target_player_id,
                    correct=correct,
                )
            )
    return TypeGuessStatusResponse(submitted=submitted, total=room.player_limit, revealed=revealed, results=results)
