from fastapi import APIRouter

from ..schemas.report import CompatEntry, ReportResponse, TypeInfo

router = APIRouter(prefix="/rooms/{code}/report", tags=["reports"])


@router.get("/{nickname}", response_model=ReportResponse)
def get_report(code: str, nickname: str) -> ReportResponse:
    """Axis/type/compat scoring isn't implemented yet; this is a mock response for the screen contract."""
    return ReportResponse(
        name=nickname,
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
        narrative="주도 4.7에 계획 1.2. 팀에서 가장 먼저 움직입니다.",
    )
