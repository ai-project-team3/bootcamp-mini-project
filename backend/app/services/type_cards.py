"""유형 맞히기에 뿌릴 카드를 한 번 정하고 그대로 붙잡아 둔다 (기획안 §4-9).

카드를 뿌릴 때마다 유형을 다시 계산하면 두 가지가 어긋난다.

1. 먼저 낸 사람의 맞히기 기록이 관찰력을 바꾸므로, 나중에 카드를 받은 사람은
   다른 유형이 적힌 카드를 본다 — 같은 판에서 카드가 사람마다 달라진다.
2. 공개 화면은 카드에 적힌 유형을 보여주고 리포트는 다시 계산한 유형을 보여줘서,
   방금 "당신의 카드는 X"라고 해놓고 리포트에 Y가 뜬다.

그래서 이 단계에 들어온 시점의 값을 `GameResult(kind="TYPE_CARD")`로 한 번
박아두고, 카드도 공개도 리포트도 전부 그 행을 읽는다. 이 단계에서 나온
맞히기가 능력치 수치는 계속 움직이지만 **유형은 카드가 뿌려진 순간 확정**이다.
"""

from sqlalchemy.orm import Session

from ..models.game_result import GameResult
from ..models.player import Player
from ..models.room import Room
from .scoring import (
    DOM_ANSWER_WEIGHT,
    DOM_NUNCHI_WEIGHT,
    compute_behavior_abilities,
    compute_guess_hits,
    compute_nunchi_scores,
    determine_type,
    obs_from_hits,
)

KIND = "TYPE_CARD"


def _code(value: float) -> str:
    return f"T{int(value)}"


def read(db: Session, room_id: str, players: list[Player]) -> dict[str, str]:
    """박아둔 값. 아직 없으면 빈 dict."""
    rows = (
        db.query(GameResult)
        .filter(GameResult.room_id == room_id, GameResult.kind == KIND)
        .all()
    )
    frozen = {r.player_id: _code(r.value) for r in rows}
    if len(frozen) < len(players):
        return {}
    return frozen


def freeze(db: Session, room: Room, players: list[Player]) -> dict[str, str]:
    """이미 있으면 그대로, 없으면 지금 계산해서 박고 돌려준다."""
    existing = read(db, room.id, players)
    if existing:
        return existing

    abilities = compute_behavior_abilities(db, room.id, players)
    nunchi = compute_nunchi_scores(db, room.id, players)
    hits = compute_guess_hits(db, room.id, players)
    types: dict[str, str] = {}
    for p in players:
        a = abilities[p.id]
        dom = a["DOM"] * DOM_ANSWER_WEIGHT + nunchi[p.id] * DOM_NUNCHI_WEIGHT
        got, tried = hits[p.id]
        types[p.id] = determine_type(dom, a["EXP"], obs_from_hits(got, tried), a["SPD"])

    for p in players:
        db.add(
            GameResult(
                room_id=room.id,
                player_id=p.id,
                kind=KIND,
                round_no=1,
                value=float(int(types[p.id][1:])),
            )
        )
    db.commit()
    return types
