import uuid

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class GameResult(Base):
    """Plan doc §14 GameResult — 추측이 아닌 게임 기록.

    kind ∈ {NUNCHI_RANK, NUNCHI_CLASH, NUNCHI_MISS, LIAR_ROLE, LIAR_SURVIVED, TYPE_CARD}
      NUNCHI_PRESS   눌렀다는 기록. 순서와 간격은 created_at으로 판정한다
      NUNCHI_RANK    한 판에서 몇 번째로 눌렀나 (round_no=판 번호, value=등수)
      NUNCHI_CLASH   붙어서 눌러 걸렸나 (value=1). 주도력 집계에서 빠진다
      NUNCHI_MISS    끝까지 안 눌러서 걸렸나 (value=1). 등수는 꼴찌로 남는다
      LIAR_ROLE      그 판에서 라이어였나 (value=1)
      LIAR_SURVIVED  라이어인데 안 걸렸나 (value=1)
      TYPE_CARD      유형 맞히기에 뿌린 카드의 유형 (value=1~8 → T1~T8).
                     카드·공개·리포트가 같은 유형을 말하도록 한 번만 박는다
                     (services/type_cards)
    """

    __tablename__ = "game_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id: Mapped[str] = mapped_column(String(36), ForeignKey("rooms.id"), index=True)
    player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    round_no: Mapped[int] = mapped_column(Integer, default=1)
    value: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
