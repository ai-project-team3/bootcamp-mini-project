from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.player import Player
from ..models.room import Room
from ..schemas.player import PlayerJoinRequest, PlayerResponse

router = APIRouter(prefix="/rooms/{code}/players", tags=["players"])


def _get_room(code: str, db: Session) -> Room:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return room


@router.get("", response_model=list[PlayerResponse])
def list_players(code: str, db: Session = Depends(get_db)) -> list[Player]:
    room = _get_room(code, db)
    return db.query(Player).filter(Player.room_id == room.id).order_by(Player.seat_no).all()


@router.post("", response_model=PlayerResponse)
def join_room(code: str, payload: PlayerJoinRequest, db: Session = Depends(get_db)) -> Player:
    room = _get_room(code, db)
    if room.status != "WAITING":
        raise HTTPException(status_code=400, detail="이미 시작된 방입니다")

    current_count = db.query(Player).filter(Player.room_id == room.id).count()
    if current_count >= room.player_limit:
        raise HTTPException(status_code=400, detail="정원이 가득 찼습니다")

    player = Player(
        room_id=room.id,
        nickname=payload.nickname,
        gender=payload.gender,
        mbti=payload.mbti,
        seat_no=current_count + 1,
        is_host=False,
    )
    db.add(player)
    db.commit()
    db.refresh(player)
    return player
