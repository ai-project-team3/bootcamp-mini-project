from sqlalchemy import String, Float
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Ability(Base):
    """Plan doc §13 Ability. PK = (room_id, player_id, code, source)."""

    __tablename__ = "abilities"

    room_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    player_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    code: Mapped[str] = mapped_column(String(3), primary_key=True)  # DOM|SPD|EXP|EMP|OBS
    source: Mapped[str] = mapped_column(String(16), primary_key=True)  # BEHAVIOR|IMPRESSION_PRE|IMPRESSION_POST
    value: Mapped[float] = mapped_column(Float)  # 0.0 ~ 5.0
