from pydantic import BaseModel


class ParticipantJoinRequest(BaseModel):
    nickname: str


class ParticipantResponse(BaseModel):
    id: str
    room_id: str
    nickname: str
    is_host: bool

    class Config:
        from_attributes = True
