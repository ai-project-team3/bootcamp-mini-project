from pydantic import BaseModel


class NunchiPressRequest(BaseModel):
    player_id: str


class NunchiStateResponse(BaseModel):
    round_no: int
    total_rounds: int
    pressed: int
    total: int
    stage: str  # RUNNING | SUCCESS | FAIL
    # 마지막 판이 실패로 끝나도 단계는 끝난다. stage만 보면 FAIL에서 멈춰
    # 화면이 영영 안 넘어간다 — 색과 종료를 따로 알린다.
    finished: bool = False
    order: list[str] = []      # 누른 순서대로 닉네임
    clashed: list[str] = []    # 동시에 눌러 판을 깬 사람
    i_pressed: bool = False
