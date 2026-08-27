import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Room(Base):
    """Session room, keyed by plan doc §3 category (TP/MT/DY/NT)."""

    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(6), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(2))  # TP | MT | DY | NT
    frame: Mapped[str] = mapped_column(String(4))  # MANY | PAIR
    status: Mapped[str] = mapped_column(String(16), default="WAITING")  # WAITING|IN_PROGRESS|DONE
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
