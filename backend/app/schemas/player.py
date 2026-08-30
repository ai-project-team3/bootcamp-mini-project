from typing import Optional

from pydantic import BaseModel, Field

# 이름 없는 사람이 들어오면 첫인상 투표도 유형 맞히기도 "누구를" 고르는지 알
# 수 없고, 리포트에는 빈칸이 남는다. 화면에서도 막지만 여기서도 막는다 —
# 화면은 하나가 아니고, 새로 만든 화면이 이 규칙을 안 지킬 수 있다.
NICKNAME = Field(min_length=1, max_length=12)


class PlayerJoinRequest(BaseModel):
    nickname: str = NICKNAME
    gender: str  # M | F
    mbti: Optional[str] = None


class PlayerResponse(BaseModel):
    id: str
    room_id: str
    nickname: str
    gender: str
    mbti: Optional[str] = None
    seat_no: int
    is_host: bool

    class Config:
        from_attributes = True
