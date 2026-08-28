"""방·참가자를 꺼내는 공통 헬퍼. 라우터마다 같은 조회를 다시 쓰지 않는다."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models.player import Player
from ..models.room import Room


def get_room(code: str, db: Session) -> Room:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    return room


def get_players(room_id: str, db: Session) -> list[Player]:
    return db.query(Player).filter(Player.room_id == room_id).order_by(Player.seat_no).all()


def require_phase(room: Room, phase: str) -> None:
    if room.phase != phase:
        raise HTTPException(status_code=409, detail=f"지금 단계가 아닙니다 (현재 {room.phase})")
