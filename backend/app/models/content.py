import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Content(Base):
    """Plan doc §14 Content — 채점과 무관한 생성물.

    kind ∈ {TELEPATHY, TRAITS, LIAR_WORDS, TYPE_SUBTITLES}
    payload는 JSON 문자열. 채점에 안 들어가므로 블록별로 따로 폴백해도 안전하다
    (§5-3).
    """

    __tablename__ = "contents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    payload: Mapped[str] = mapped_column(Text)
