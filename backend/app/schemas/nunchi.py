from pydantic import BaseModel


class NunchiPressRequest(BaseModel):
    player_id: str


class NunchiStateResponse(BaseModel):
    round_no: int
    total_rounds: int
    pressed: int
    total: int
    stage: str  # RUNNING | RESULT
    # 마지막 판이 어떻게 끝나든 단계는 끝난다. stage만 보면 결과 화면에서 멈춰
    # 화면이 영영 안 넘어간다 — 결과와 종료를 따로 알린다.
    finished: bool = False
    order: list[str] = []       # 누른 순서대로 닉네임
    clashed: list[str] = []     # 동시에 눌러서 걸린 사람
    missed: list[str] = []      # 끝까지 안 눌러서 걸린 사람
    failed: list[str] = []      # clashed + missed. 화면이 쓰는 건 이 목록이다
    i_pressed: bool = False
    i_failed: bool = False
