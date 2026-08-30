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
    # 방금 끝난 사람의 정답. 다음 차례 정보와 같이 실어 보내서, 화면이 정답을
    # 몇 초 보여준 뒤 스스로 다음 차례로 넘어갈 수 있게 한다. 서버가 "누가
    # 누르면" 넘기는 방식이면 답이 낸 사람에게만 스쳤다가 사라진다.
    reveal_nickname: Optional[str] = None
    reveal_index: Optional[int] = None
    reveal_correct_guessers: list[str] = []
