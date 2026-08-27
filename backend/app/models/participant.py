import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Participant(Base):
    """Plan doc §4-5. One row per (person, room).

    `user_id` is the person and `id` is this particular join, so the same person
    entering a TP room and a DY room produces two Participant rows but one
    user_id. Nickname and gender live on User, not here.
    """

    __tablename__ = "participants"
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_participant_room_user"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.user_id"), index=True)
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id"), index=True)
    is_host: Mapped[bool] = mapped_column(Boolean, default=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
