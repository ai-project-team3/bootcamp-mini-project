from pydantic import BaseModel


class ParticipantJoinRequest(BaseModel):
    user_id: str


class ParticipantResponse(BaseModel):
    id: str
    user_id: str
    room_id: str
    nickname: str  # denormalised from User for the waiting-room list
    is_host: bool
