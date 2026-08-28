from typing import Optional

from pydantic import BaseModel


class StatementIn(BaseModel):
    slot: int
    text: str
    is_lie: bool


class StatementsSubmitRequest(BaseModel):
    player_id: str
    statements: list[StatementIn]


class StatementsProgressResponse(BaseModel):
    submitted: int
    total: int


class StatementOut(BaseModel):
    slot: int
    text: str


class GuessOut(BaseModel):
    guesser_nickname: str
    guessed_slot: int


class TurnResponse(BaseModel):
    done: bool = False  # 모든 턴이 끝났을 때 True — 나머지 필드는 무시
    target_player_id: Optional[str] = None
    nickname: Optional[str] = None
    statements: list[StatementOut] = []
    submitted: int = 0
    total: int = 4
    revealed: bool = False
    correct_slot: Optional[int] = None
    guesses: list[GuessOut] = []


class LieGuessRequest(BaseModel):
    guesser_id: str
    guessed_slot: int
