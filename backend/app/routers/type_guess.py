"""얼음땡 기획안 §4-9 — 누가 나를 맞힐까.

카드는 방 인원수만큼 나오고 **자기 카드도 그 안에 섞여 있다**. 그래서 카드마다
사람을 배정하는 한 번의 동작이 남 맞히기와 자기 예측을 같이 끝낸다.

앞에 자기 유형을 8개 목록에서 먼저 찍게 하던 단계가 있었는데, 그 시점에는
유형 이름을 처음 보는 상태라 근거 없는 8지선다였다. 유형을 게임 전에 미리
보여줄 수도 없다 — 무엇이 되고 싶은지 알면 그렇게 플레이하게 되고, 그러면
측정이 깨진다(§3-4와 같은 이유). 지금은 카드에 부제가 붙어 나오고 그중에서
고르므로, 처음 보는 이름이어도 읽고 판단할 근거가 화면에 있다.

배정 N장은 전부 같은 모양의 Guess 행으로 남고, 그중 **자기 자신을 가리킨 한
행이 곧 자기 예측**이다. 관찰력에는 그 한 장을 뺀 N-1장만 들어간다 — 자기
카드를 찾은 것은 남을 관찰한 결과가 아니다(§6).

정답은 **사람이 아니라 유형으로** 따진다. 두 사람의 유형이 같으면 카드 두 장이
글자 하나 다르지 않게 똑같이 나오는데, 구별할 수 없는 것을 틀렸다고 하면 안
된다. 그래서 "내가 붙인 사람의 유형 == 그 카드의 유형"이면 맞힌 것으로 본다.
"""

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
    TypeGuessStatusResponse,
)
from ..services import type_cards

router = APIRouter(prefix="/rooms/{code}/type-guess", tags=["type-guess"])


def _get_room(code: str, db: Session) -> Room:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return room


def _players(room_id: str, db: Session) -> list[Player]:
    return db.query(Player).filter(Player.room_id == room_id).order_by(Player.seat_no).all()


def _card_types(db: Session, room: Room, players: list[Player]) -> dict[str, str]:
    """카드에 박힌 유형. 이 단계에 처음 들어온 순간 확정된다 (services/type_cards)."""
    return type_cards.freeze(db, room, players)


@router.get("/cards", response_model=list[CardOut])
def get_cards(code: str, player_id: str = Query(...), db: Session = Depends(get_db)) -> list[CardOut]:
    """방 인원수만큼. 본인 카드도 들어 있고, 어느 것인지는 알려주지 않는다."""
    room = _get_room(code, db)
    players = _players(room.id, db)
    types = _card_types(db, room, players)
    # player_id 자체가 무작위성을 갖는 UUID이므로 정렬만으로도 매 호출 안정적인
    # 의사 랜덤 순서가 나온다(추가 상태 저장 없이 카드 순서 고정). 자리 순서로
    # 두면 몇 번째 카드가 누구인지가 그대로 드러나므로 섞는 것이 아니라 감추는
    # 것이 목적이다.
    deck = sorted(players, key=lambda p: p.id)
    cards = []
    for p in deck:
        spec = TYPES[types[p.id]]
        cards.append(
            CardOut(
                card_id=p.id,
                type_code=types[p.id],
                name=spec["name"],
                subtitle=spec["subtitle"],
                color=spec["color"],
                symbol=spec["symbol"],
                image=spec.get("image"),
            )
        )
    return cards


@router.post("/assign", response_model=TypeGuessStatusResponse)
def submit_assignment(code: str, payload: AssignRequest, db: Session = Depends(get_db)) -> TypeGuessStatusResponse:
    room = _get_room(code, db)
    players = _players(room.id, db)
    seat_by_player = {p.id: p.seat_no for p in players}
    all_ids = {p.id for p in players}

    if len(payload.assignments) != len(all_ids):
        raise HTTPException(status_code=400, detail=f"{len(all_ids)}장을 모두 배정해야 합니다")
    card_ids = {a.card_id for a in payload.assignments}
    target_ids = {a.target_player_id for a in payload.assignments}
    if card_ids != all_ids or target_ids != all_ids:
        raise HTTPException(status_code=400, detail="배정이 올바르지 않습니다")

    types = _card_types(db, room, players)

    # 다시 내면 통째로 갈아끼운다.
    db.query(Guess).filter(
        Guess.room_id == room.id,
        Guess.kind == "TYPE",
        Guess.guesser_id == payload.player_id,
    ).delete()
    for a in payload.assignments:
        # N장을 전부 같은 모양으로 남긴다. round_no에 카드 실소유자의 자리가
        # 들어가므로, 자기 자신을 가리킨 한 행이 곧 자기 예측이 된다 —
        # guesser_id == target_player_id인 행이 그것이다.
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

    status = _assign_status(room, db, players, payload.player_id)
    if status.revealed and room.phase == "TYPE_GUESS":
        room.status = "DONE"
        room.phase = "DONE"
        db.commit()
    return status


@router.get("/status", response_model=TypeGuessStatusResponse)
def get_status(
    code: str,
    player_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> TypeGuessStatusResponse:
    room = _get_room(code, db)
    players = _players(room.id, db)
    return _assign_status(room, db, players, player_id)


def _assign_status(
    room: Room,
    db: Session,
    players: list[Player],
    player_id: str | None = None,
) -> TypeGuessStatusResponse:
    seat_by_player = {p.id: p.seat_no for p in players}
    nickname_by_player = {p.id: p.nickname for p in players}
    guesses = db.query(Guess).filter(Guess.room_id == room.id, Guess.kind == "TYPE").all()

    # 한 사람이 다 내면 카드 수만큼, 즉 인원수만큼 행이 들어온다.
    by_guesser: dict[str, int] = {}
    for g in guesses:
        by_guesser[g.guesser_id] = by_guesser.get(g.guesser_id, 0) + 1
    submitted = sum(1 for count in by_guesser.values() if count == len(players))
    revealed = submitted >= room.player_limit

    response = TypeGuessStatusResponse(submitted=submitted, total=room.player_limit, revealed=revealed)
    if not revealed or player_id is None:
        return response

    my_seat = seat_by_player.get(player_id)
    types = type_cards.read(db, room.id, players)

    def hit(g: Guess) -> bool:
        """붙인 사람의 유형이 카드의 유형과 같으면 맞힌 것."""
        return types.get(g.target_player_id) == g.target_type_code

    # 내 카드를 남들이 누구에게 붙였나. round_no가 카드 실소유자의 자리이므로
    # 내 자리 번호를 단 행이 곧 내 카드에 대한 판단이다.
    response.results = [
        AssignResultEntry(guesser_nickname=nickname_by_player.get(g.guesser_id, ""), correct=hit(g))
        for g in guesses
        if g.round_no == my_seat and g.guesser_id != player_id
    ]
    # 내 성적에서는 자기 자신을 가리킨 한 장을 뺀다. 그건 남을 본 게 아니다.
    mine = [g for g in guesses if g.guesser_id == player_id and g.target_player_id != player_id]
    response.my_tries = len(mine)
    response.my_hits = sum(1 for g in mine if hit(g))

    response.self_type_code = types.get(player_id)
    my_self_guess = next(
        (g for g in guesses if g.guesser_id == player_id and g.target_player_id == player_id), None
    )
    response.self_guess_type_code = my_self_guess.target_type_code if my_self_guess else None
    return response
