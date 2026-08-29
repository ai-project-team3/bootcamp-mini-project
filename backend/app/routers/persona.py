"""Hand the finished personas to whatever plays next.

The icebreaking run produces the personas; the games downstream consume them.
That makes this side the source of the shape, so the abilities go out under
their own names and the games map them to whatever their rules need.

Scale converts here rather than at the far end: abilities are 0.0-5.0 for the
radar, and every consumer so far wants integers, so they leave as 0-100. Doing
it once, at the boundary, keeps the conversion out of both codebases' logic.

The body matches what app/mafia/routers/persona.py already accepts
(`players[].playerId` / `players[].personaScores`), so a consumer can POST this
response through unchanged.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..constants import ABILITY_CODES
from ..database import get_db
from ..models.ability import Ability
from ..models.player import Player
from ..models.room import Room
from ..schemas.persona import PersonaEntry, PersonaHandoffResponse

router = APIRouter(prefix="/rooms/{code}/persona", tags=["persona"])

SCALE = 20  # 0.0-5.0 → 0-100


def _to_hundred(value: float) -> int:
    return max(0, min(100, round(value * SCALE)))


@router.get("", response_model=PersonaHandoffResponse)
def get_persona_handoff(code: str, db: Session = Depends(get_db)) -> PersonaHandoffResponse:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    if room.status != "DONE":
        raise HTTPException(status_code=400, detail="아직 게임이 끝나지 않았습니다")

    players = db.query(Player).filter(Player.room_id == room.id).order_by(Player.seat_no).all()
    rows = (
        db.query(Ability)
        .filter(Ability.room_id == room.id, Ability.source == "BEHAVIOR")
        .all()
    )
    by_player: dict[str, dict[str, float]] = {}
    for row in rows:
        by_player.setdefault(row.player_id, {})[row.code] = row.value

    if not by_player:
        raise HTTPException(
            status_code=409,
            detail="능력치가 아직 없습니다. 리포트를 먼저 조회하세요",
        )

    entries = [
        PersonaEntry(
            playerId=p.id,
            nickname=p.nickname,
            personaScores={
                code_: _to_hundred(by_player.get(p.id, {}).get(code_, 2.5))
                for code_ in ABILITY_CODES
            },
        )
        for p in players
    ]
    return PersonaHandoffResponse(session_id=room.id, scale=100, players=entries)
