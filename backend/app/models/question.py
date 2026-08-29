import uuid
from typing import Optional

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Question(Base):
    """Plan doc §14 Question. slot ∈ {Q1..Q8, P1..P5}, kind ∈ {BINARY, IMPRESSION}.

    능력치 매핑(slot -> ability, A가 높은 쪽인지)은 여기 저장하지 않는다 — 코드
    상수(content/questions.py)가 고정하며, 생성 결과가 채점을 바꿀 수 없게 한다(§14).
    방은 생성 성공 여부와 무관하게 항상 13개 행을 갖는다(기본 세트로 즉시 채워짐).
    """

    __tablename__ = "questions"
    __table_args__ = (UniqueConstraint("room_id", "slot", name="uq_question_room_slot"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id: Mapped[str] = mapped_column(String(36))
    slot: Mapped[str] = mapped_column(String(3))  # Q1..Q8 | P1..P5
    kind: Mapped[str] = mapped_column(String(10))  # BINARY | IMPRESSION
    situation: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    choice_a: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    choice_b: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    text: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
