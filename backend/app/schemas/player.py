from typing import Optional

from pydantic import BaseModel


class PlayerJoinRequest(BaseModel):
    nickname: str
    gender: str  # M | F
    mbti: Optional[str] = None


class PlayerResponse(BaseModel):
    id: str
    room_id: str
    nickname: str
    gender: str
    mbti: Optional[str] = None
    seat_no: int
    is_host: bool

    class Config:
        from_attributes = True
