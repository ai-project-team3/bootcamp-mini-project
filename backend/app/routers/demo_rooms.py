from fastapi import APIRouter, Depends, HTTPException

from ..schemas.demo_room import (
    DemoPlayerResponse,
    DemoRoomCreateResponse,
    DemoRoomGameSelectRequest,
    DemoRoomLeaveResponse,
    DemoRoomNicknameRequest,
    DemoRoomResponse,
    DemoRoomStartRequest,
)
from ..services.demo_rooms import (
    DEMO_ROOM_MAX_PLAYERS,
    DemoPlayer,
    DemoRoom,
    DemoRoomAuthorizationError,
    DemoRoomCapacityError,
    DemoRoomNotFoundError,
    DemoRoomStartError,
    DemoRoomGameError,
    DemoRoomStore,
)

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
    )


def _player_response(player: DemoPlayer) -> DemoPlayerResponse:
    return DemoPlayerResponse(
        id=player.id,
        nickname=player.nickname,
        seat_no=player.seat_no,
        is_host=player.is_host,
    )


def _raise_http(error: Exception) -> None:
    if isinstance(error, DemoRoomNotFoundError):
        raise HTTPException(status_code=404, detail=str(error)) from error
    if isinstance(error, DemoRoomAuthorizationError):
        raise HTTPException(status_code=403, detail=str(error)) from error
    if isinstance(error, (DemoRoomCapacityError, DemoRoomStartError, DemoRoomGameError)):
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
