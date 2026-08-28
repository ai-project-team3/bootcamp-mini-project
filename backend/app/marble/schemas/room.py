from typing import Literal

from pydantic import BaseModel


class CreateRoomRequest(BaseModel):
    content_mode: Literal["general", "adult"] = "general"


class JoinRoomRequest(BaseModel):
    nickname: str
