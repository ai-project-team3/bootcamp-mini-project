import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Player(Base):
    """A person in a room. Plan doc §13 Player."""

    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id"))
    nickname: Mapped[str] = mapped_column(String(20))
    gender: Mapped[str] = mapped_column(String(1))  # M | F
    mbti: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    seat_no: Mapped[int] = mapped_column(Integer)
    is_host: Mapped[bool] = mapped_column(Boolean, default=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
