import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Guess(Base):
    """Plan doc §13 Guess — 첫인상 투표 · 거짓 찾기 · 유형 맞히기를 하나로 커버.

    kind ∈ {IMPRESSION_PRE, IMPRESSION_POST, LIE, TYPE}. 필드 재사용 규칙:
      - IMPRESSION_PRE/POST: target_player_id=지목한 사람, round_no=문항 번호(1~5)
      - LIE: target_player_id=그 턴의 대상자, target_statement_id=거짓이라고 고른 문장
      - TYPE(자기 유형 찍기): guesser_id == target_player_id(본인), target_type_code=찍은 유형
      - TYPE(카드 배정): target_player_id=이 카드 주인이라고 배정한 사람,
        target_type_code=카드에 적힌 유형, round_no=카드 실제 주인의 seat_no
        (채점 시 target_player_id의 seat_no와 비교). 새 테이블을 늘리지 않기 위해
        round_no를 "카드 정답 좌석 번호"로 재사용한다.
    """

    __tablename__ = "guesses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id"))
    kind: Mapped[str] = mapped_column(String(16))
    guesser_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"))
    target_player_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("players.id"), nullable=True)
    target_statement_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("statements.id"), nullable=True
    )
    target_type_code: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    round_no: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
