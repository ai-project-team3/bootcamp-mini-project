from pydantic import BaseModel


class CreateRoomRequest(BaseModel):
    player_count: int


class UpdatePlayerCountRequest(BaseModel):
    player_count: int


class JoinRoomRequest(BaseModel):
    nickname: str
