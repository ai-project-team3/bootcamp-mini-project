from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.axis_score import AxisScore
from ..models.user import User
from ..schemas.report import CompatEntry, ReportResponse, TypeInfo
from .rooms import require_room

router = APIRouter(prefix="/rooms/{code}/report", tags=["reports"])


@router.get("/{user_id}", response_model=ReportResponse)
def get_report(code: str, user_id: str, db: Session = Depends(get_db)) -> ReportResponse:
    """Keyed by user_id, not nickname — nicknames collide and are not identity.

    Type, badges and compatibility are still placeholders. They need the game
    stages to be producing BEHAVIOR and IMPRESSION rows first; see plan doc §6
    (type), §7 (badges) and §8 (compatibility). SELF axis values are already
    real once the survey is submitted.
    """
    room = require_room(db, code)
    user = db.get(User, user_id)

    axes = {
        row.axis_id: row.value
        for row in db.query(AxisScore)
        .filter(
            AxisScore.user_id == user_id,
            AxisScore.category == room.category,
            AxisScore.session_id == room.id,
            AxisScore.source == "SELF",
        )
        .all()
    }

    return ReportResponse(
        name=(user.nickname if user and user.nickname else "익명"),
        type=TypeInfo(
            name="선빵 불도저",
            quote="일단 만들어 왔어요",
            quote_sub="아무도 시킨 적 없음",
            strength="아무도 안 움직일 때 첫 삽을 뜬다",
        ),
        badges=["마이웨이", "첫인상 배신자"],
        compat=[
            CompatEntry(with_nickname="서연", grade="S", total=0.84),
            CompatEntry(with_nickname="지호", grade="F", total=0.22),
        ],
        narrative=(
            "설문 기반 축 값만 실제 데이터입니다. "
            f"측정된 축 {len(axes)}개. 유형·칭호·궁합은 게임 단계 구현 후 채워집니다."
        ),
    )
