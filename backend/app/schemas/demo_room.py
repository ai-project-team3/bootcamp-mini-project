from pydantic import BaseModel, ConfigDict, Field


class DemoRoomNicknameRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nickname: str = Field(min_length=1, max_length=12)


class DemoRoomCreateRequest(DemoRoomNicknameRequest):
    """Making a room, optionally carrying a finished 얼음땡 session with it.

    `source_room_code` is that session's code. The games look the group's
    abilities up from it by nickname, so nobody re-enters anything.
    """

    source_room_code: str | None = Field(default=None, max_length=12)


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


class DemoRoomFillRequest(DemoRoomStartRequest):
    """Add seats nobody has to hold, so one person can test the flow alone."""

    count: int = Field(default=1, ge=1, le=9)


class DemoPlayerResponse(BaseModel):
    id: str
    nickname: str
    seat_no: int
    is_host: bool
    is_bot: bool = False


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
    #: Set when this room grew out of a finished 얼음땡 session, so the screens
    #: can say the games will use what that session measured.
    source_room_code: str | None = None
    #: How many people here were found in that session, by nickname.
    persona_matches: int = 0


class DemoRoomClaimResponse(BaseModel):
    """One player's own seat in the launched game."""

    game_id: str
    room_id: str
    player_id: str
    is_host: bool


class DemoRoomPersonaEntry(BaseModel):
    """One player's persona, as the room's own games show it."""

    player_id: str
    nickname: str
    title: str
    traits: list[str]
    scores: dict[str, int]


class DemoRoomPersonasResponse(BaseModel):
    """Everyone in this room the icebreaking session recognised.

    Players it did not recognise are simply absent — the games fall back to
    their own placeholder for those, so a group that skipped the run still
    plays.
    """

    source_room_code: str | None = None
    players: list[DemoRoomPersonaEntry] = Field(default_factory=list)


class DemoRoomCreateResponse(BaseModel):
    room: DemoRoomResponse
    player: DemoPlayerResponse
