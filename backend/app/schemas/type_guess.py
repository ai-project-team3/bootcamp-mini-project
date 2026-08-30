from typing import Optional

from pydantic import BaseModel


class CardOut(BaseModel):
    card_id: str
    type_code: str
    name: str
    subtitle: str
    color: str
    symbol: str
    image: Optional[str] = None


class AssignmentIn(BaseModel):
    card_id: str
    target_player_id: str


class AssignRequest(BaseModel):
    player_id: str
    assignments: list[AssignmentIn]


class AssignResultEntry(BaseModel):
    """공개 화면에 뜨는 한 줄 — 내 카드를 이 사람은 맞혔나."""

    guesser_nickname: str
    correct: bool


class TypeGuessStatusResponse(BaseModel):
    submitted: int
    total: int
    revealed: bool
    # 공개 전에는 아래가 전부 비어 있다. player_id를 안 넘기면 공개 뒤에도 비어 있다.
    self_type_code: Optional[str] = None
    self_guess_type_code: Optional[str] = None
    my_hits: int = 0
    my_tries: int = 0
    results: list[AssignResultEntry] = []
