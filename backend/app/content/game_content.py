"""방마다 쓸 게임 소재를 꺼낸다.

생성된 것이 있으면 그걸, 없으면 소재 풀에서 방 id를 씨앗으로 뽑는다. 씨앗을
방 id로 고정해 두면 같은 방은 언제 조회해도 같은 소재가 나오고(새로고침해도
문제가 안 되고), 다른 방은 다른 소재를 받는다.
"""

import json
import random

from sqlalchemy.orm import Session

from ..models.content import Content
from .pools import pick_liar_words, pick_telepathy, pick_traits

TELEPATHY_ROUNDS = 4
LIAR_ROUNDS = 2


def _stored(db: Session, room_id: str, kind: str):
    row = db.query(Content).filter(Content.room_id == room_id, Content.kind == kind).first()
    if row is None:
        return None
    try:
        return json.loads(row.payload)
    except (ValueError, TypeError):
        return None


def _rng(room_id: str, salt: str) -> random.Random:
    return random.Random(f"{room_id}:{salt}")


def telepathy_rounds(db: Session, room_id: str) -> list[dict[str, str]]:
    stored = _stored(db, room_id, "TELEPATHY")
    if stored and len(stored) >= TELEPATHY_ROUNDS:
        return stored[:TELEPATHY_ROUNDS]
    return pick_telepathy(TELEPATHY_ROUNDS, _rng(room_id, "telepathy"))


def trait_options(db: Session, room_id: str) -> list[str]:
    stored = _stored(db, room_id, "TRAITS")
    if stored and len(stored) >= 6:
        return stored[:6]
    return pick_traits(_rng(room_id, "traits"))


def liar_words(db: Session, room_id: str) -> list[dict[str, str]]:
    stored = _stored(db, room_id, "LIAR_WORDS")
    if stored and len(stored) >= LIAR_ROUNDS:
        return stored[:LIAR_ROUNDS]
    return pick_liar_words(LIAR_ROUNDS, _rng(room_id, "liar"))


def type_subtitles(db: Session, room_id: str) -> dict[str, str]:
    stored = _stored(db, room_id, "TYPE_SUBTITLES")
    return stored if isinstance(stored, dict) else {}


def save(db: Session, room_id: str, kind: str, payload) -> None:
    row = db.query(Content).filter(Content.room_id == room_id, Content.kind == kind).first()
    text = json.dumps(payload, ensure_ascii=False)
    if row is None:
        db.add(Content(room_id=room_id, kind=kind, payload=text))
    else:
        row.payload = text
    db.commit()
