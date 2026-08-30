from pydantic import BaseModel


class TelepathyRoundResponse(BaseModel):
    round_no: int
    total_rounds: int
    # 무엇을 묻는지. 이게 없으면 "나는?" 밑에 단어 두 개만 놓이고, 캐리어와
    # 배낭 중 무엇을 고르라는 건지 알 수 없다.
    topic: str = ""
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
