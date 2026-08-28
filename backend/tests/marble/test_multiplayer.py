"""Rules that only appear once a room holds more than two people."""

import random

import pytest

from app.marble.game import engine
from app.marble.game.cards import needs_forfeit_target
from app.marble.models.room import (
    MAX_PLAYERS,
    MIN_PLAYERS,
    ContentMode,
    GamePhase,
    Player,
    Room,
)
from app.marble.persona.provider import MockPersonaProvider


def make_room(size: int, mode: ContentMode = ContentMode.GENERAL) -> Room:
    room = Room(room_id="R", content_mode=mode, max_players=size)
    for i in range(size):
        pid = f"p{i}"
        player = Player(player_id=pid, nickname=f"n{i}")
        # The real provider so personas carry the traits the quiz bank reads.
        player.persona = MockPersonaProvider().get_persona(pid, f"n{i}")
        room.players[pid] = player
        room.turn_order.append(pid)
    room.host_player_id = room.turn_order[0]
    return room


@pytest.mark.parametrize("size", range(MIN_PLAYERS, MAX_PLAYERS + 1))
def test_a_room_of_any_supported_size_can_start(size):
    room = make_room(size)
    engine.start_game(room)
    assert room.phase is GamePhase.ROLL_DICE
    assert room.current_player_id == room.turn_order[0]
    assert len(room.board) == 12


def test_a_room_is_not_full_until_every_seat_is_taken():
    room = make_room(5)
    del room.players["p4"]
    room.turn_order.remove("p4")
    assert not room.is_full()
    with pytest.raises(engine.InvalidPhase):
        engine.start_game(room)


@pytest.mark.parametrize("size", range(MIN_PLAYERS, MAX_PLAYERS + 1))
def test_the_turn_goes_all_the_way_round_the_table(size):
    room = make_room(size)
    engine.start_game(room)
    seen = [room.current_player_id]
    for _ in range(size - 1):
        engine.advance_turn(room)
        seen.append(room.current_player_id)
    assert seen == room.turn_order, "자리 순서대로 돌지 않음"

    engine.advance_turn(room)
    assert room.current_player_id == room.turn_order[0], "한 바퀴 뒤 처음으로 안 돌아옴"


def test_a_skipped_player_is_passed_over_exactly_once():
    room = make_room(4)
    engine.start_game(room)
    room.players["p1"].skip_next_turn = True

    engine.advance_turn(room)
    assert room.current_player_id == "p2", "건너뛰기가 적용되지 않음"
    assert room.players["p1"].skip_next_turn is False, "건너뛰기 표시가 안 지워짐"

    # p2 -> p3 -> p0 -> p1: the skip is spent, so p1 gets the next lap's turn.
    for _ in range(3):
        engine.advance_turn(room)
    assert room.current_player_id == "p1", "다음 바퀴에 또 건너뛰었음"


def test_the_turn_returns_to_the_current_player_when_everyone_else_is_skipped():
    room = make_room(3)
    engine.start_game(room)
    for pid in ("p1", "p2"):
        room.players[pid].skip_next_turn = True

    engine.advance_turn(room)
    assert room.current_player_id == "p0"


@pytest.mark.parametrize("size", range(MIN_PLAYERS, MAX_PLAYERS + 1))
def test_the_quiz_is_about_somebody_else(size):
    room = make_room(size)
    engine.start_game(room)
    for _ in range(30):
        room.phase = GamePhase.ROLL_DICE
        engine.roll_dice(room, room.current_player_id)
        if room.quiz is not None:
            assert room.quiz_subject_id in room.players
            assert room.quiz_subject_id != room.current_player_id
        engine.advance_turn(room)


@pytest.mark.parametrize("size", range(MIN_PLAYERS, MAX_PLAYERS + 1))
def test_adult_mode_draws_a_dare_target_from_the_table(size):
    """19금 벌칙은 사람이 사람에게 하는 것이라 대상이 뽑혀야 한다."""
    room = make_room(size, ContentMode.ADULT)
    engine.start_game(room)
    random.seed(3)
    for pid in room.turn_order:
        engine._assign_forfeit(room, pid)
        assert room.assigned_forfeit
        assert room.forfeit_target_id in room.players, "벌칙 대상이 참가자가 아님"
        assert room.forfeit_target_id != pid, "자기 자신이 대상으로 뽑힘"


@pytest.mark.parametrize("size", range(MIN_PLAYERS, MAX_PLAYERS + 1))
def test_general_mode_leaves_the_dare_untargeted(size):
    room = make_room(size, ContentMode.GENERAL)
    engine.start_game(room)
    for pid in room.turn_order:
        engine._assign_forfeit(room, pid)
        assert room.assigned_forfeit
        assert room.forfeit_target_id is None, "일반 모드인데 대상이 지정됨"


def test_only_adult_mode_needs_a_target():
    assert needs_forfeit_target(ContentMode.ADULT) is True
    assert needs_forfeit_target(ContentMode.GENERAL) is False


def test_the_dare_target_is_spread_across_the_table_not_fixed():
    room = make_room(6, ContentMode.ADULT)
    engine.start_game(room)
    random.seed(11)
    picked = set()
    for _ in range(200):
        engine._assign_forfeit(room, "p0")
        picked.add(room.forfeit_target_id)
    assert picked == {"p1", "p2", "p3", "p4", "p5"}, f"대상이 골고루 안 뽑힘: {picked}"


def test_the_host_can_resize_the_room_before_it_starts():
    from fastapi.testclient import TestClient

    from app.marble.store import store
    from app.main import app

    store.clear()
    client = TestClient(app)
    room_id = client.post("/marble/rooms", json={"content_mode": "general", "max_players": 2}).json()[
        "room_id"
    ]
    for name in ("민준", "서연"):
        client.post(f"/marble/rooms/{room_id}/join", json={"nickname": name})

    grown = client.post(f"/marble/rooms/{room_id}/max-players", json={"max_players": 6})
    assert grown.status_code == 200
    assert grown.json() == {"max_players": 6}
    assert client.get(f"/marble/rooms/{room_id}/state").json()["max_players"] == 6

    # A third player can now get in, where before the room was full.
    assert client.post(f"/marble/rooms/{room_id}/join", json={"nickname": "도윤"}).status_code == 200


def test_the_room_cannot_shrink_below_the_people_already_in_it():
    from fastapi.testclient import TestClient

    from app.marble.store import store
    from app.main import app

    store.clear()
    client = TestClient(app)
    room_id = client.post("/marble/rooms", json={"content_mode": "general", "max_players": 5}).json()[
        "room_id"
    ]
    for name in ("민준", "서연", "도윤"):
        client.post(f"/marble/rooms/{room_id}/join", json={"nickname": name})

    assert (
        client.post(f"/marble/rooms/{room_id}/max-players", json={"max_players": 2}).status_code == 400
    )
    assert client.get(f"/marble/rooms/{room_id}/state").json()["max_players"] == 5


def test_the_room_cannot_be_resized_once_the_game_is_running():
    from fastapi.testclient import TestClient

    from app.marble.store import store
    from app.main import app

    store.clear()
    client = TestClient(app)
    room_id = client.post("/marble/rooms", json={"content_mode": "general", "max_players": 2}).json()[
        "room_id"
    ]
    for name in ("민준", "서연"):
        client.post(f"/marble/rooms/{room_id}/join", json={"nickname": name})
    client.post(f"/marble/rooms/{room_id}/start")

    assert (
        client.post(f"/marble/rooms/{room_id}/max-players", json={"max_players": 4}).status_code == 400
    )


def test_an_out_of_range_room_size_is_rejected():
    from fastapi.testclient import TestClient

    from app.marble.store import store
    from app.main import app

    store.clear()
    client = TestClient(app)
    room_id = client.post("/marble/rooms", json={"content_mode": "general", "max_players": 2}).json()[
        "room_id"
    ]
    for size in (1, 9):
        assert (
            client.post(f"/marble/rooms/{room_id}/max-players", json={"max_players": size}).status_code
            == 422
        )
