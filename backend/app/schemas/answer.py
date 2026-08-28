from pydantic import BaseModel


class AnswerSubmitRequest(BaseModel):
    player_id: str
    choice: str  # A | B
    elapsed_ms: int


class AnswerResult(BaseModel):
    player_id: str
    nickname: str
    choice: str


class AnswerStatusResponse(BaseModel):
    question_no: int
    submitted: int
    total: int
    revealed: bool
    results: list[AnswerResult] = []
