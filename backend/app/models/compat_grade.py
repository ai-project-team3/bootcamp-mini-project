from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class CompatGrade(Base):
    """Plan doc §7-4. The same pair can land on a different grade per category."""

    __tablename__ = "compat_grades"

    user_a: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_b: Mapped[str] = mapped_column(String(36), primary_key=True)
    category: Mapped[str] = mapped_column(String(2), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    total: Mapped[float] = mapped_column(Float)
    grade: Mapped[str] = mapped_column(String(1))  # S|A|B|C|F
