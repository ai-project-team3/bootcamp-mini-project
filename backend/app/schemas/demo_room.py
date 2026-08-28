from pydantic import BaseModel, ConfigDict, Field


class DemoRoomNicknameRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nickname: str = Field(min_length=1, max_length=12)


class DemoRoomStartRequest(BaseModel):
    player_id: str


class DemoRoomLeaveResponse(BaseModel):
    ended: bool


class DemoRoomGameSelectRequest(DemoRoomStartRequest):
    game_id: str = Field(min_length=1, max_length=40)


class DemoPlayerResponse(BaseModel):
    id: str
    nickname: str
    seat_no: int
    is_host: bool


class DemoRoomResponse(BaseModel):
    code: str
    status: str
    player_count: int
    max_players: int
    selected_game_id: str | None = None
    game_phase: str


class DemoRoomCreateResponse(BaseModel):
    room: DemoRoomResponse
    player: DemoPlayerResponse
