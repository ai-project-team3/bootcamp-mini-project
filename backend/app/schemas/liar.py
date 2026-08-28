from typing import Optional

from pydantic import BaseModel


class LiarSeenRequest(BaseModel):
    player_id: str


class LiarContinueRequest(BaseModel):
    player_id: str
    more: bool


class LiarAccuseRequest(BaseModel):
    player_id: str
    target_player_id: str


class LiarWordGuessRequest(BaseModel):
    player_id: str
    word: str


class LiarStateResponse(BaseModel):
    round_no: int
    total_rounds: int
    stage: str  # WORD | SPEAK | VOTE | ACCUSE | REVEAL | DONE
    lap: int = 1
    my_word: Optional[str] = None
    am_i_liar: bool = False
    seen: int = 0
    total: int = 0
    speaker_player_id: Optional[str] = None
    speaker_nickname: Optional[str] = None
    speaker_index: int = 0
    votes_more: int = 0
    votes_now: int = 0
    voted: int = 0
    accused: int = 0
    accused_nickname: Optional[str] = None
    liar_nickname: Optional[str] = None
    liar_caught: bool = False
    major_word: Optional[str] = None
    liar_won: bool = False
