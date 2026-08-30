"""Plan doc §4-3 — 텔레파시.

두 번 탭한다. ①은 내 취향, ②는 나와 같은 걸 고를 것 같은 사람.

①은 능력치를 만들지 않는다. 부먹이냐 찍먹이냐로 주도력을 재는 것은 억지다.
여기서 나오는 것은 궁합(누구와 겹쳤나)뿐이고, ②만 관찰력으로 간다 —
일반 상식이 아니라 지금 앞에 있는 사람을 맞히는 것이라서 거짓말 찾기와
같은 종류다.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..content.game_content import TELEPATHY_ROUNDS, telepathy_rounds
from ..database import get_db
from ..models.guess import Guess
from ..schemas.telepathy import (
    TelepathyRoundResponse,
    TelepathyStatusResponse,
    TelepathySubmitRequest,
)
from ..services.flow import next_phase
from ..utils.room_ctx import get_players, get_room

router = APIRouter(prefix="/rooms/{code}/telepathy", tags=["telepathy"])

KIND = "TELEPATHY"


@router.get("/{round_no}", response_model=TelepathyRoundResponse)
def get_round(code: str, round_no: int, db: Session = Depends(get_db)) -> TelepathyRoundResponse:
    room = get_room(code, db)
    rounds = telepathy_rounds(db, room.id)
    if not 1 <= round_no <= len(rounds):
        raise HTTPException(status_code=404, detail="존재하지 않는 라운드입니다")
    pair = rounds[round_no - 1]
    return TelepathyRoundResponse(
        round_no=round_no,
        total_rounds=len(rounds),
        topic=pair.get("topic", ""),
        a=pair["a"],
        b=pair["b"],
    )


@router.post("/{round_no}", response_model=TelepathyStatusResponse)
def submit(
    code: str, round_no: int, payload: TelepathySubmitRequest, db: Session = Depends(get_db)
) -> TelepathyStatusResponse:
    room = get_room(code, db)
    if payload.choice not in ("A", "B"):
        raise HTTPException(status_code=400, detail="A 또는 B여야 합니다")
    if payload.predicted_player_id == payload.player_id:
        raise HTTPException(status_code=400, detail="자기 자신은 고를 수 없습니다")

    db.query(Guess).filter(
        Guess.room_id == room.id,
        Guess.kind == KIND,
        Guess.guesser_id == payload.player_id,
        Guess.round_no == round_no,
    ).delete()
    db.add(
        Guess(
            room_id=room.id,
            kind=KIND,
            guesser_id=payload.player_id,
            target_player_id=payload.predicted_player_id,
            target_choice=payload.choice,
            round_no=round_no,
        )
    )
    db.commit()

    status = _status(room, round_no, db)
    if status.revealed and round_no >= TELEPATHY_ROUNDS and room.phase == "TELEPATHY":
        room.phase = next_phase("TELEPATHY", room.player_limit)
        db.commit()
    return status


@router.get("/{round_no}/status", response_model=TelepathyStatusResponse)
def get_status(code: str, round_no: int, db: Session = Depends(get_db)) -> TelepathyStatusResponse:
    return _status(get_room(code, db), round_no, db)


def _status(room, round_no: int, db: Session) -> TelepathyStatusResponse:
    guesses = (
        db.query(Guess)
        .filter(Guess.room_id == room.id, Guess.kind == KIND, Guess.round_no == round_no)
        .all()
    )
    submitted = len(guesses)
    revealed = submitted >= room.player_limit
    if not revealed:
        return TelepathyStatusResponse(
            round_no=round_no, submitted=submitted, total=room.player_limit, revealed=False
        )

    choice_by_player = {g.guesser_id: g.target_choice for g in guesses}
    nickname = {p.id: p.nickname for p in get_players(room.id, db)}

    # 같은 쪽을 고른 사람끼리 묶는다. 이름은 여기서만 나온다 — 취향은 숨길
    # 이유가 없고, 겹친 걸 눈으로 봐야 대화가 붙는다 (능력치와 무관한 소재라
    # §3-4의 "개인 선택은 가린다"가 적용되지 않는 자리).
    groups = {
        "A": [nickname[pid] for pid, c in choice_by_player.items() if c == "A" and pid in nickname],
        "B": [nickname[pid] for pid, c in choice_by_player.items() if c == "B" and pid in nickname],
    }
    hits = [
        nickname[g.guesser_id]
        for g in guesses
        if g.target_player_id in choice_by_player
        and choice_by_player[g.target_player_id] == g.target_choice
        and g.guesser_id in nickname
    ]
    return TelepathyStatusResponse(
        round_no=round_no,
        submitted=submitted,
        total=room.player_limit,
        revealed=True,
        group_a=groups["A"],
        group_b=groups["B"],
        correct_guessers=hits,
    )
