import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Statement(Base):
    """Plan doc §13 Statement — 둘은 진실 하나는 거짓. slot ∈ {1,2,3}."""

    __tablename__ = "statements"
    __table_args__ = (
        UniqueConstraint("room_id", "player_id", "slot", name="uq_statement_room_player_slot"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id"))
    player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"))
    slot: Mapped[int] = mapped_column(Integer)  # 1~3
    text: Mapped[str] = mapped_column(String(60))  # O2: 글자 수 상한 60자(가정)
    is_lie: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
