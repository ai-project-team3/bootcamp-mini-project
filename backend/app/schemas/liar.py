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


class LiarNextRequest(BaseModel):
    player_id: str


class LiarWordGuessRequest(BaseModel):
    player_id: str
    word: str


class LiarStateResponse(BaseModel):
    round_no: int
    total_rounds: int
    stage: str  # WORD | SPEAK | VOTE | ACCUSE | REVEAL | DONE
    lap: int = 1
    # 이번이 마지막 바퀴인가. 화면이 MAX_LAPS를 따로 알 필요가 없게 여기서 알린다.
    last_lap: bool = False
    my_word: Optional[str] = None
    am_i_liar: bool = False
    seen: int = 0
    # 나는 준비됐다고 눌렀나. 제시어를 본 것과 시작할 준비가 된 것은 다르다.
    i_am_seen: bool = False
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
    # 걸린 라이어가 아직 제시어를 안 냈다 — 제시어도 승패도 아직 공개 전
    word_pending: bool = False
    liar_won: bool = False
    # 결과 화면에서 넘어갈 준비가 된 사람 수. 각자 자기 속도로 넘어간다.
    ready: int = 0
    i_am_ready: bool = False
