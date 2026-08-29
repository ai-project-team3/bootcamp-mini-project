import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class User(Base):
    """Plan doc §4-5. The person themselves.

    Issued anonymously on first visit and kept in the browser's localStorage.
    Survives across rooms and categories, which is what lets AxisScore and
    CompatGrade join back to a person. Participant.id cannot do that job — it is
    created fresh for every room.
    """

    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    nickname: Mapped[str] = mapped_column(String(20), default="")
    gender: Mapped[str] = mapped_column(String(8), default="UNSET")  # FEMALE | MALE | UNSET
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
