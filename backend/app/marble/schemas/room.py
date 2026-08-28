from typing import Literal

from pydantic import BaseModel, Field

from app.marble.models.room import MAX_PLAYERS, MIN_PLAYERS


class CreateRoomRequest(BaseModel):
    content_mode: Literal["general", "adult"] = "general"
    max_players: int = Field(default=MIN_PLAYERS, ge=MIN_PLAYERS, le=MAX_PLAYERS)


class JoinRoomRequest(BaseModel):
    nickname: str


class UpdateMaxPlayersRequest(BaseModel):
    max_players: int = Field(ge=MIN_PLAYERS, le=MAX_PLAYERS)


class LeaveRoomRequest(BaseModel):
    player_id: str
