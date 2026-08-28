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


class DemoRoomGameLaunchRequest(DemoRoomGameSelectRequest):
    """Picking a game that runs its own room.

    `options` is whatever that game asked the host for at the moment of
    choosing — settings its own entry screen used to collect, which a group
    coming from the shared room never sees. Only the game reads them.
    """

    options: dict[str, str] = Field(default_factory=dict)


class DemoPlayerResponse(BaseModel):
    id: str
    nickname: str
    seat_no: int
    is_host: bool


class DemoRoomLaunchResponse(BaseModel):
    """Which game the room jumped into, without saying who anybody is.

    The per-player ids stay on the server; everyone polls this and then claims
    their own seat through `/launch/claim`.
    """

    game_id: str
    room_id: str


class DemoRoomResponse(BaseModel):
    code: str
    status: str
    player_count: int
    max_players: int
    selected_game_id: str | None = None
    game_phase: str
    launch: DemoRoomLaunchResponse | None = None


class DemoRoomClaimResponse(BaseModel):
    """One player's own seat in the launched game."""

    game_id: str
    room_id: str
    player_id: str
    is_host: bool


class DemoRoomCreateResponse(BaseModel):
    room: DemoRoomResponse
    player: DemoPlayerResponse
