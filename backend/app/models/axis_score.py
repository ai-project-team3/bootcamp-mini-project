from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AxisScore(Base):
    """Plan doc §4-4. PK = (user_id, category, axis_id, source, session_id)."""

    __tablename__ = "axis_scores"

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    category: Mapped[str] = mapped_column(String(2), primary_key=True)  # TP|MT|DY|NT
    axis_id: Mapped[str] = mapped_column(String(10), primary_key=True)  # DOM, SPD, ... TP_DDL 등
    source: Mapped[str] = mapped_column(String(11), primary_key=True)  # SELF|BEHAVIOR|IMPRESSION
    session_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    value: Mapped[float] = mapped_column(Float)  # 0.0 ~ 5.0
