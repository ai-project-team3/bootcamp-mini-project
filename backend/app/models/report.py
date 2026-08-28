from typing import Optional

from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Report(Base):
    """Plan doc §13 Report — 최초 GET /rooms/{code}/report 호출 시 계산해 캐시한다."""

    __tablename__ = "reports"

    room_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    player_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    type_code: Mapped[str] = mapped_column(String(2))
    comment_lines: Mapped[list] = mapped_column(JSON)
    badges: Mapped[list] = mapped_column(JSON)
    quote: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
