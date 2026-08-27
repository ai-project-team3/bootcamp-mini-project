from pydantic import BaseModel


class RoomCreateRequest(BaseModel):
    category: str  # TP | MT | DY | NT
    host_nickname: str


class RoomResponse(BaseModel):
    id: str
    code: str
    category: str
    frame: str
    status: str

    class Config:
        from_attributes = True
