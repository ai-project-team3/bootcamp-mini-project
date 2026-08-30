"""Plan doc §4-6 — 눈치 게임.

버튼 하나. 먼저 누른 사람부터 순서가 정해지고, 둘이 붙어서 누르면 그 둘이
걸린다. **끝까지 안 누른 마지막 한 명도 걸린다** — 그게 이 게임의 원래 규칙이다.

그래서 한 판은 **인원-1명이 누른 순간** 닫힌다. 전원이 누를 때까지 기다리면
버티는 쪽이 이기는 게임에서 버티는 사람 때문에 판이 안 끝난다. 마지막 한 명이
누를 이유가 없는데 그 사람의 누름을 기다리는 것은 규칙과 어긋난다.

폰에 볼 게 버튼 하나뿐이라는 것이 이 게임의 전부다. 답이 화면에 없으니 남을
봐야 이긴다 — 열 단계 중 유일하게 화면에서 눈을 떼게 만드는 자리.

순서는 서버 도착 시각으로 판정한다. 클라이언트 시계를 믿으면 시계를 앞당긴
사람이 항상 1등이 되고, 어차피 같은 방에 있는 사람들이라 지연은 비슷하다.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.game_result import GameResult
from ..models.player import Player
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
MISS = "NUNCHI_MISS"


def _target_presses(room: Room) -> int:
    """판이 닫히는 누름 수 — 마지막 한 명은 안 누르는 것으로 끝난다."""
    return max(room.player_limit - 1, 1)


def _presses(room: Room, round_no: int, db: Session) -> list[GameResult]:
    return (
        db.query(GameResult)
        .filter(GameResult.room_id == room.id, GameResult.kind == PRESS, GameResult.round_no == round_no)
        .order_by(GameResult.created_at, GameResult.id)
        .all()
    )


def _settled(room: Room, round_no: int, db: Session) -> bool:
    return bool(
        db.query(GameResult)
        .filter(GameResult.room_id == room.id, GameResult.kind == RANK, GameResult.round_no == round_no)
        .count()
    )


def _current_round(room: Room, db: Session) -> int:
    for r in range(1, TOTAL_ROUNDS + 1):
        if not _settled(room, r, db):
            return r
    return TOTAL_ROUNDS


def _display_round(room: Room, db: Session) -> int:
    """Which round GET /state reports.

    press() must always route new presses to the first unsettled round, or the
    round after a just-closed one could never accept a press. But reporting
    that same round to GET /state means the moment a round closes, /state
    jumps straight to the next (empty) round — nobody ever sees the result.
    So the display round lags one step: it keeps showing a just-closed round
    until somebody presses in the next one.
    """
    current = _current_round(room, db)
    if current > 1 and _settled(room, current - 1, db) and not _presses(room, current, db):
        return current - 1
    return current


@router.post("/press", response_model=NunchiStateResponse)
def press(code: str, payload: NunchiPressRequest, db: Session = Depends(get_db)) -> NunchiStateResponse:
    room = get_room(code, db)
    round_no = _current_round(room, db)
    if _settled(room, round_no, db):
        raise HTTPException(status_code=409, detail="이 판은 끝났습니다")
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
    if len(presses) >= _target_presses(room):
        _settle(room, round_no, presses, db)
        if round_no >= TOTAL_ROUNDS and room.phase == "NUNCHI":
            room.phase = next_phase("NUNCHI", room.player_limit)
            db.commit()
    return _state(room, db, payload.player_id)


@router.get("/state", response_model=NunchiStateResponse)
def get_state(code: str, player_id: str = "", db: Session = Depends(get_db)) -> NunchiStateResponse:
    return _state(get_room(code, db), db, player_id)


def _settle(room: Room, round_no: int, presses: list[GameResult], db: Session) -> None:
    """등수를 남기고, 걸린 사람을 표시한다.

    걸리는 경우는 둘이다. 붙어서 누른 사람(CLASH)과 끝내 안 누른 사람(MISS).
    등수는 다르게 매긴다 — 붙어서 누른 사람은 나서긴 했으므로 주도력 집계에서
    빼기만 하고, 안 누른 사람은 끝까지 안 나선 것이므로 꼴찌를 준다.
    """
    if _settled(room, round_no, db):
        return

    players: list[Player] = get_players(room.id, db)
    pressed_ids = [p.player_id for p in presses]
    for rank, p in enumerate(presses, start=1):
        db.add(
            GameResult(room_id=room.id, player_id=p.player_id, kind=RANK, round_no=round_no, value=float(rank))
        )

    last_rank = float(len(players))
    for player in players:
        if player.id in pressed_ids:
            continue
        db.add(GameResult(room_id=room.id, player_id=player.id, kind=MISS, round_no=round_no, value=1.0))
        db.add(GameResult(room_id=room.id, player_id=player.id, kind=RANK, round_no=round_no, value=last_rank))

    clashed: set[str] = set()
    for prev, cur in zip(presses, presses[1:]):
        gap_ms = (cur.created_at - prev.created_at).total_seconds() * 1000
        if gap_ms < CLASH_MS:
            clashed.add(prev.player_id)
            clashed.add(cur.player_id)
    for pid in clashed:
        db.add(GameResult(room_id=room.id, player_id=pid, kind=CLASH, round_no=round_no, value=1.0))
    db.commit()


def _marked(room: Room, round_no: int, kind: str, db: Session) -> list[str]:
    return [
        r.player_id
        for r in db.query(GameResult)
        .filter(GameResult.room_id == room.id, GameResult.kind == kind, GameResult.round_no == round_no)
        .all()
    ]


def _state(room: Room, db: Session, player_id: str) -> NunchiStateResponse:
    round_no = _display_round(room, db)
    presses = _presses(room, round_no, db)
    nickname = {p.id: p.nickname for p in get_players(room.id, db)}
    done = _settled(room, round_no, db)

    clashed_ids = _marked(room, round_no, CLASH, db) if done else []
    missed_ids = _marked(room, round_no, MISS, db) if done else []
    failed_ids = clashed_ids + [pid for pid in missed_ids if pid not in clashed_ids]

    return NunchiStateResponse(
        round_no=round_no,
        total_rounds=TOTAL_ROUNDS,
        pressed=len(presses),
        total=room.player_limit,
        stage="RESULT" if done else "RUNNING",
        finished=done and round_no >= TOTAL_ROUNDS,
        order=[nickname.get(p.player_id, "") for p in presses] if done else [],
        clashed=[nickname.get(pid, "") for pid in clashed_ids],
        missed=[nickname.get(pid, "") for pid in missed_ids],
        failed=[nickname.get(pid, "") for pid in failed_ids],
        i_pressed=any(p.player_id == player_id for p in presses),
        i_failed=player_id in failed_ids,
    )
