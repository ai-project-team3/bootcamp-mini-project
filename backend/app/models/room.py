import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, DateTime, func
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

    # 기획안은 5명 고정이지만(§2), 테스트 편의를 위해 방마다 정원을 설정할 수 있게
    # 했다(사용자 요청). MIN_PLAYERS~MAX_PLAYERS 범위 안에서 호스트가 방 생성 시 정한다.
    player_limit: Mapped[int] = mapped_column(Integer, default=5)

    # 얼음땡 기획안 §5, §14 — 호스트가 적은 프로젝트 설명과 문항 생성 결과.
    project_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    team_kind: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    context_line: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    question_source: Mapped[str] = mapped_column(String(10), default="DEFAULT")  # GENERATED|DEFAULT
