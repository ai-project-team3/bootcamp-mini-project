from typing import Optional

from pydantic import BaseModel


class TraitOptionsResponse(BaseModel):
    options: list[str]
    submitted: int
    total: int


class TraitSelfRequest(BaseModel):
    player_id: str
    option_index: int


class TraitGuessRequest(BaseModel):
    guesser_id: str
    option_index: int


class TraitTurnResponse(BaseModel):
    done: bool = False
    options: list[str] = []
    target_player_id: Optional[str] = None
    nickname: Optional[str] = None
    submitted: int = 0
    total: int = 0
    revealed: bool = False
    correct_index: Optional[int] = None
    correct_guessers: list[str] = []
