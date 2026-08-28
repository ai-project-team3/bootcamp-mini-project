from pydantic import BaseModel


class TelepathyRoundResponse(BaseModel):
    round_no: int
    total_rounds: int
    a: str
    b: str


class TelepathySubmitRequest(BaseModel):
    player_id: str
    choice: str  # A | B
    predicted_player_id: str


class TelepathyStatusResponse(BaseModel):
    round_no: int
    submitted: int
    total: int
    revealed: bool
    group_a: list[str] = []
    group_b: list[str] = []
    correct_guessers: list[str] = []
