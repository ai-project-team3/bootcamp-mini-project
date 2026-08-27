from pydantic import BaseModel


class RoomCreateRequest(BaseModel):
    category: str  # TP | MT | DY | NT
    user_id: str  # host


class RoomStartRequest(BaseModel):
    user_id: str  # must be the host


class RoomResponse(BaseModel):
    id: str
    code: str
    category: str
    frame: str
    status: str

    class Config:
        from_attributes = True
