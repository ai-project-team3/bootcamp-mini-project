from pydantic import BaseModel


class PlayerActionRequest(BaseModel):
    player_id: str


class AnswerRequest(BaseModel):
    player_id: str
    choice_index: int
