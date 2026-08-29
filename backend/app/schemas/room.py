from typing import Optional

from pydantic import BaseModel

from ..constants import DEFAULT_PLAYER_LIMIT


class RoomCreateRequest(BaseModel):
    nickname: str
    gender: str  # M | F
    mbti: Optional[str] = None
    project_text: str = ""  # 얼음땡 기획안 §4-0, §5. 빈 문자열이면 생성 없이 기본 세트.
    player_limit: int = DEFAULT_PLAYER_LIMIT  # 테스트 편의를 위한 방별 정원(사용자 요청, 기획안엔 없음)


class RoomResponse(BaseModel):
    id: str
    code: str
    status: str
    phase: str
    player_limit: int
    team_kind: Optional[str] = None
    question_source: str

    class Config:
        from_attributes = True


class RoomStartRequest(BaseModel):
    player_id: str


class RegenerateQuestionsRequest(BaseModel):
    player_id: str
