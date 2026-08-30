"""Reading a finished icebreaking session's abilities, by nickname.

The group that played 얼음땡 comes back together for the games afterwards, but
they gather in a fresh room with fresh ids — so the only thing linking a player
here to the person who earned those abilities is the name they go by. Matching
on it is what a human at the table would do, and it is the whole of the link:
a name that does not match simply arrives without a persona, and the games fill
in neutral 50s.

`routers/persona.py` exposes the same data over HTTP for a consumer outside
this codebase. This is the in-process path, used when the app hands its own
group over.
"""

from sqlalchemy.orm import Session

from ..constants import ABILITY_LABELS
from ..models.ability import Ability
from ..models.player import Player
from ..models.room import Room

#: 0.0~5.0 abilities go out as 0~100 integers, converted once at the boundary —
#: the same scale `routers/persona.py` publishes.
SCALE = 20


def _to_hundred(value: float) -> int:
    return max(0, min(100, round(value * SCALE)))


def normalize_nickname(nickname: str) -> str:
    """What two nicknames have to share to be the same person.

    Spaces and case only: somebody who typed "김 하늘" in one room and "김하늘"
    in the next is the same person at the same table.
    """
    return "".join(nickname.split()).casefold()


def scores_by_nickname(db: Session, code: str) -> dict[str, dict[str, int]]:
    """Every player's abilities from that session, keyed by normalized nickname.

    Empty when the session does not exist, has not finished, or has not had its
    report opened yet — the abilities are computed and stored at that moment.
    Empty is not an error here: the games are playable without a persona, so a
    group that skipped the run should still get to play.
    """
    room = db.query(Room).filter(Room.code == code.upper()).first()
    if room is None or room.status != "DONE":
        return {}

    rows = (
        db.query(Ability)
        .filter(Ability.room_id == room.id, Ability.source == "BEHAVIOR")
        .all()
    )
    if not rows:
        return {}

    by_player: dict[str, dict[str, int]] = {}
    for row in rows:
        by_player.setdefault(row.player_id, {})[row.code] = _to_hundred(row.value)

    players = db.query(Player).filter(Player.room_id == room.id).all()
    return {
        normalize_nickname(player.nickname): by_player[player.id]
        for player in players
        if player.id in by_player
    }


#: A one-line persona for the games that show one to a person rather than
#: computing with it — 너 누구야?, 너라면?.
#:
#: Derived from the strongest ability rather than invented, and worded from the
#: labels 얼음땡 already uses for its roles (`services/scoring.ROLE_DEFS`), so a
#: player reads the same thing about themselves on both sides.
_TITLES = {
    "DOM": ("먼저 나서는 사람", ("주도", "결정", "추진")),
    "SPD": ("제일 먼저 손이 나가는 사람", ("즉흥", "속도", "실행")),
    "EXP": ("말이 잘 붙는 사람", ("표현", "설명", "분위기")),
    "EMP": ("중간을 찾는 사람", ("공감", "조율", "배려")),
    "OBS": ("남이 흘린 걸 다 보는 사람", ("관찰", "기록", "차분")),
}


def describe(scores: dict[str, int]) -> dict:
    """Turn one player's abilities into something a screen can show."""
    if not scores:
        return {"title": "아직 성향이 없는 사람", "traits": ["미참여"], "top": None}
    top = max(scores, key=lambda axis: scores[axis])
    title, traits = _TITLES.get(top, ("성향을 재는 중", ("측정중",)))
    return {
        "title": title,
        "traits": list(traits),
        "top": top,
        "top_label": ABILITY_LABELS.get(top, top),
    }
