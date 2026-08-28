from pydantic import BaseModel


class ImpressionVote(BaseModel):
    question_no: int
    target_player_id: str


class ImpressionSubmitRequest(BaseModel):
    player_id: str
    votes: list[ImpressionVote]


class ImpressionTally(BaseModel):
    player_id: str
    nickname: str
    votes: int


class ImpressionQuestionResult(BaseModel):
    question_no: int
    tally: list[ImpressionTally]


class ImpressionStatusResponse(BaseModel):
    submitted: int
    total: int
    revealed: bool
    results: list[ImpressionQuestionResult] = []
