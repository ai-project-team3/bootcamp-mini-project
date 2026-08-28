"""Plan doc §4-6 — 눈치 게임.

버튼 하나. 1등부터 순서대로 눌러야 하고 둘이 동시에 누르면 그 판은 실패다.

폰에 볼 게 버튼 하나뿐이라는 것이 이 게임의 전부다. 답이 화면에 없으니 남을
봐야 이긴다 — 열 단계 중 유일하게 화면에서 눈을 떼게 만드는 자리.

순서는 서버 도착 시각으로 판정한다. 클라이언트 시계를 믿으면 시계를 앞당긴
사람이 항상 1등이 되고, 어차피 같은 방에 있는 사람들이라 지연은 비슷하다.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.game_result import GameResult
from ..models.room import Room
from ..schemas.nunchi import NunchiPressRequest, NunchiStateResponse
from ..services.flow import next_phase
from ..utils.room_ctx import get_players, get_room

router = APIRouter(prefix="/rooms/{code}/nunchi", tags=["nunchi"])

TOTAL_ROUNDS = 3
# 이 안에 들어온 두 누름은 "동시"로 본다. 사람 손으로 구분할 수 없는 간격이고,
# 더 좁히면 네트워크 지연이 승패를 가른다.
CLASH_MS = 350

PRESS = "NUNCHI_PRESS"
RANK = "NUNCHI_RANK"
CLASH = "NUNCHI_CLASH"


def _presses(room: Room, round_no: int, db: Session) -> list[GameResult]:
    return (
        db.query(GameResult)
        .filter(GameResult.room_id == room.id, GameResult.kind == PRESS, GameResult.round_no == round_no)
        .order_by(GameResult.created_at, GameResult.id)
        .all()
    )


def _current_round(room: Room, db: Session) -> int:
    for r in range(1, TOTAL_ROUNDS + 1):
        if len(_presses(room, r, db)) < room.player_limit:
            return r
    return TOTAL_ROUNDS


@router.post("/press", response_model=NunchiStateResponse)
def press(code: str, payload: NunchiPressRequest, db: Session = Depends(get_db)) -> NunchiStateResponse:
    room = get_room(code, db)
    round_no = _current_round(room, db)
    already = (
        db.query(GameResult)
        .filter(
            GameResult.room_id == room.id,
            GameResult.kind == PRESS,
            GameResult.round_no == round_no,
            GameResult.player_id == payload.player_id,
        )
        .first()
    )
    if already is not None:
        raise HTTPException(status_code=409, detail="이미 눌렀습니다")

    db.add(GameResult(room_id=room.id, player_id=payload.player_id, kind=PRESS, round_no=round_no, value=0.0))
    db.commit()

    presses = _presses(room, round_no, db)
    if len(presses) >= room.player_limit:
        _settle(room, round_no, presses, db)
        if round_no >= TOTAL_ROUNDS and room.phase == "NUNCHI":
            room.phase = next_phase("NUNCHI", room.player_limit)
            db.commit()
    return _state(room, db, payload.player_id)


@router.get("/state", response_model=NunchiStateResponse)
def get_state(code: str, player_id: str = "", db: Session = Depends(get_db)) -> NunchiStateResponse:
    return _state(get_room(code, db), db, player_id)


def _settle(room: Room, round_no: int, presses: list[GameResult], db: Session) -> None:
    """등수를 남기고, 붙어 있는 누름을 동시 누름으로 표시한다."""
    if db.query(GameResult).filter(
        GameResult.room_id == room.id, GameResult.kind == RANK, GameResult.round_no == round_no
    ).count():
        return  # 이미 정산됨

    for rank, p in enumerate(presses, start=1):
        db.add(
            GameResult(room_id=room.id, player_id=p.player_id, kind=RANK, round_no=round_no, value=float(rank))
        )

    clashed: set[str] = set()
    for prev, cur in zip(presses, presses[1:]):
        gap_ms = (cur.created_at - prev.created_at).total_seconds() * 1000
        if gap_ms < CLASH_MS:
            clashed.add(prev.player_id)
            clashed.add(cur.player_id)
    for pid in clashed:
        db.add(GameResult(room_id=room.id, player_id=pid, kind=CLASH, round_no=round_no, value=1.0))
    db.commit()


def _state(room: Room, db: Session, player_id: str) -> NunchiStateResponse:
    round_no = _current_round(room, db)
    presses = _presses(room, round_no, db)
    nickname = {p.id: p.nickname for p in get_players(room.id, db)}
    complete = len(presses) >= room.player_limit

    clashed_rows = (
        db.query(GameResult)
        .filter(GameResult.room_id == room.id, GameResult.kind == CLASH, GameResult.round_no == round_no)
        .all()
        if complete
        else []
    )
    clashed = [nickname.get(r.player_id, "") for r in clashed_rows]

    if not complete:
        stage = "RUNNING"
    elif clashed:
        stage = "FAIL"
    else:
        stage = "SUCCESS"
    finished = complete and round_no >= TOTAL_ROUNDS

    return NunchiStateResponse(
        round_no=round_no,
        total_rounds=TOTAL_ROUNDS,
        pressed=len(presses),
        total=room.player_limit,
        stage=stage,
        finished=finished,
        order=[nickname.get(p.player_id, "") for p in presses] if complete else [],
        clashed=clashed,
        i_pressed=any(p.player_id == player_id for p in presses),
    )
