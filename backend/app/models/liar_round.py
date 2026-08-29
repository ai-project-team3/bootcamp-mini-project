import uuid
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class LiarRound(Base):
    """Plan doc §4-7 — 라이어 한 판의 진행 상태.

    Room에 컬럼을 여섯 개 붙이는 대신 판마다 한 행을 둔다. 판이 둘이고
    각각 독립적으로 흘러서, 방 하나에 상태를 밀어 넣으면 두 번째 판이
    첫 판의 잔여 상태를 물려받는다.

    stage 흐름:
      WORD    각자 제시어 확인 → 전원 확인하면 SPEAK
      SPEAK   시계 방향 한 마디씩 → 한 바퀴 끝나면 VOTE
      VOTE    한 바퀴 더 vs 지목 → 다수결. MORE면 SPEAK로 되돌아가고 lap += 1
      ACCUSE  각자 한 명 지목 → 전원 내면 REVEAL
      REVEAL  결과 공개
    """

    __tablename__ = "liar_rounds"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id"), index=True)
    round_no: Mapped[int] = mapped_column(Integer)
    stage: Mapped[str] = mapped_column(String(8), default="WORD")
    lap: Mapped[int] = mapped_column(Integer, default=1)
    speaker_seat: Mapped[int] = mapped_column(Integer, default=1)
    liar_player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"))
    major_word: Mapped[str] = mapped_column(String(40))
    minor_word: Mapped[str] = mapped_column(String(40))
    accused_player_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    liar_guessed_word: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
