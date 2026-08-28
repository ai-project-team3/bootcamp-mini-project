from fastapi import APIRouter, Depends, HTTPException

from ..schemas.demo_room import (
    DemoPlayerResponse,
    DemoRoomClaimResponse,
    DemoRoomCreateResponse,
    DemoRoomFillRequest,
    DemoRoomGameLaunchRequest,
    DemoRoomGameSelectRequest,
    DemoRoomLaunchResponse,
    DemoRoomLeaveResponse,
    DemoRoomNicknameRequest,
    DemoRoomResponse,
    DemoRoomStartRequest,
)
from ..services.demo_rooms import (
    DEMO_ROOM_MAX_PLAYERS,
    DemoLaunch,
    DemoPlayer,
    DemoRoom,
    DemoRoomAuthorizationError,
    DemoRoomCapacityError,
    DemoRoomLaunchError,
    DemoRoomNotFoundError,
    DemoRoomStartError,
    DemoRoomGameError,
    DemoRoomStore,
)
from ..services.game_launch import GameLaunchError, LaunchablePlayer, launch as launch_game

router = APIRouter(prefix='/demo/rooms', tags=['demo-rooms'])
_store = DemoRoomStore()


def get_demo_room_store() -> DemoRoomStore:
    return _store


def _room_response(room: DemoRoom) -> DemoRoomResponse:
    return DemoRoomResponse(
        code=room.code,
        status=room.status,
        player_count=len(room.players),
        max_players=DEMO_ROOM_MAX_PLAYERS,
        selected_game_id=room.selected_game_id,
        game_phase=room.game_phase,
        launch=(
            DemoRoomLaunchResponse(game_id=room.launch.game_id, room_id=room.launch.room_id)
            if room.launch is not None
            else None
        ),
    )


def _player_response(player: DemoPlayer) -> DemoPlayerResponse:
    return DemoPlayerResponse(
        id=player.id,
        nickname=player.nickname,
        seat_no=player.seat_no,
        is_host=player.is_host,
        is_bot=player.is_bot,
    )


def _raise_http(error: Exception) -> None:
    if isinstance(error, DemoRoomNotFoundError):
        raise HTTPException(status_code=404, detail=str(error)) from error
    if isinstance(error, DemoRoomAuthorizationError):
        raise HTTPException(status_code=403, detail=str(error)) from error
    if isinstance(
        error,
        (DemoRoomCapacityError, DemoRoomStartError, DemoRoomGameError, DemoRoomLaunchError),
    ):
        raise HTTPException(status_code=400, detail=str(error)) from error
    if isinstance(error, GameLaunchError):
        raise HTTPException(status_code=400, detail=str(error)) from error
    raise error


@router.post('', response_model=DemoRoomCreateResponse)
def create_demo_room(
    payload: DemoRoomNicknameRequest,
    store: DemoRoomStore = Depends(get_demo_room_store),
) -> DemoRoomCreateResponse:
    room, player = store.create_room(payload.nickname)
    return DemoRoomCreateResponse(room=_room_response(room), player=_player_response(player))


@router.get('/{code}', response_model=DemoRoomResponse)
def get_demo_room(
    code: str,
    store: DemoRoomStore = Depends(get_demo_room_store),
) -> DemoRoomResponse:
    try:
        return _room_response(store.get_room(code.upper()))
    except Exception as error:
        _raise_http(error)


@router.get('/{code}/players', response_model=list[DemoPlayerResponse])
def list_demo_players(
    code: str,
    store: DemoRoomStore = Depends(get_demo_room_store),
) -> list[DemoPlayerResponse]:
    try:
        return [_player_response(player) for player in store.list_players(code.upper())]
    except Exception as error:
        _raise_http(error)


@router.post('/{code}/players', response_model=DemoPlayerResponse)
def join_demo_room(
    code: str,
    payload: DemoRoomNicknameRequest,
    store: DemoRoomStore = Depends(get_demo_room_store),
) -> DemoPlayerResponse:
    try:
        return _player_response(store.join_room(code.upper(), payload.nickname))
    except Exception as error:
        _raise_http(error)


@router.post('/{code}/test-players', response_model=DemoRoomResponse)
def fill_test_players(
    code: str,
    payload: DemoRoomFillRequest,
    store: DemoRoomStore = Depends(get_demo_room_store),
) -> DemoRoomResponse:
    """Demo-only: fill empty seats with bots that play themselves."""
    try:
        return _room_response(store.fill_test_players(code.upper(), payload.player_id, payload.count))
    except Exception as error:
        _raise_http(error)


@router.post('/{code}/start', response_model=DemoRoomResponse)
def start_demo_room(
    code: str,
    payload: DemoRoomStartRequest,
    store: DemoRoomStore = Depends(get_demo_room_store),
) -> DemoRoomResponse:
    try:
        return _room_response(store.start_room(code.upper(), payload.player_id))
    except Exception as error:
        _raise_http(error)


@router.post('/{code}/game-selection', response_model=DemoRoomResponse)
def select_demo_game(
    code: str,
    payload: DemoRoomGameSelectRequest,
    store: DemoRoomStore = Depends(get_demo_room_store),
) -> DemoRoomResponse:
    try:
        return _room_response(store.select_game(code.upper(), payload.player_id, payload.game_id))
    except Exception as error:
        _raise_http(error)


@router.post('/{code}/game/start', response_model=DemoRoomResponse)
def start_selected_demo_game(
    code: str,
    payload: DemoRoomStartRequest,
    store: DemoRoomStore = Depends(get_demo_room_store),
) -> DemoRoomResponse:
    try:
        return _room_response(store.start_selected_game(code.upper(), payload.player_id))
    except Exception as error:
        _raise_http(error)


@router.post('/{code}/game-launch', response_model=DemoRoomResponse)
def launch_room_game(
    code: str,
    payload: DemoRoomGameLaunchRequest,
    store: DemoRoomStore = Depends(get_demo_room_store),
) -> DemoRoomResponse:
    """Start a game that runs its own rooms, for everyone already gathered.

    Nobody re-enters a nickname or a code: the game's room is built around the
    roster of this one, and each player then claims their own seat below.
    """
    def build(players: list[DemoPlayer]) -> DemoLaunch:
        launched = launch_game(
            payload.game_id,
            [
                LaunchablePlayer(
                    id=p.id, nickname=p.nickname, is_host=p.is_host, is_bot=p.is_bot
                )
                for p in players
            ],
            payload.options,
        )
        return DemoLaunch(
            game_id=launched.game_id,
            room_id=launched.room_id,
            player_ids=launched.player_ids,
        )

    try:
        return _room_response(store.launch_game(code.upper(), payload.player_id, build))
    except Exception as error:
        _raise_http(error)


@router.post('/{code}/game-launch/claim', response_model=DemoRoomClaimResponse)
def claim_launched_game(
    code: str,
    payload: DemoRoomStartRequest,
    store: DemoRoomStore = Depends(get_demo_room_store),
) -> DemoRoomClaimResponse:
    try:
        launch, player = store.claim_launch(code.upper(), payload.player_id)
    except Exception as error:
        _raise_http(error)
    return DemoRoomClaimResponse(
        game_id=launch.game_id,
        room_id=launch.room_id,
        player_id=launch.player_ids[player.id],
        is_host=player.is_host,
    )


@router.post('/{code}/leave', response_model=DemoRoomLeaveResponse)
def leave_demo_room(
    code: str,
    payload: DemoRoomStartRequest,
    store: DemoRoomStore = Depends(get_demo_room_store),
) -> DemoRoomLeaveResponse:
    try:
        return DemoRoomLeaveResponse(ended=store.leave_room(code.upper(), payload.player_id))
    except Exception as error:
        _raise_http(error)
