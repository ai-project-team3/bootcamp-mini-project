import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Answer(Base):
    """Plan doc §13 Answer — 이지선다 8문항. elapsed_ms가 순발력의 재료."""

    __tablename__ = "answers"
    __table_args__ = (
        UniqueConstraint("room_id", "player_id", "question_no", name="uq_answer_room_player_question"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id"))
    player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"))
    question_no: Mapped[int] = mapped_column(Integer)  # 1~8
    choice: Mapped[str] = mapped_column(String(1))  # A | B
    elapsed_ms: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
