import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base

# Plan doc §4: 6-stage phase machine driving GamePage/StatementsPage.
PHASES = (
    "ENTRY",
    "IMPRESSION_PRE",
    "ANSWER",
    "STATEMENT",
    "IMPRESSION_POST",
    "TYPE_GUESS",
    "DONE",
)


class Room(Base):
    """A single 5-player 얼음땡 game session, keyed by a shareable room code.

    Plan doc §13 names this "Session"; kept as "Room" here since the existing
    room-code/route infrastructure already models the identical concept.
    """

    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(6), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(16), default="WAITING")  # WAITING|IN_PROGRESS|DONE
    phase: Mapped[str] = mapped_column(String(16), default="ENTRY")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
