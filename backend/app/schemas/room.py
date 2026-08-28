from typing import Optional

from pydantic import BaseModel


class RoomCreateRequest(BaseModel):
    nickname: str
    gender: str  # M | F
    mbti: Optional[str] = None


class RoomResponse(BaseModel):
    id: str
    code: str
    status: str
    phase: str

    class Config:
        from_attributes = True


class RoomStartRequest(BaseModel):
    player_id: str
