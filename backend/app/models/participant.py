import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Participant(Base):
    """A person in a room. Linked to AxisScore/CompatGrade via user_id."""

    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id"))
    nickname: Mapped[str] = mapped_column(String(20))
    is_host: Mapped[bool] = mapped_column(Boolean, default=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
