"""Leaving a room has to leave nothing behind.

'게임 선택으로 돌아가기' promises a clean slate: whoever comes back has to make
a new room and invite people again. These tests pin the server half of that —
the room really is gone, and the players still in it are told so.
"""

from fastapi.testclient import TestClient

from app.main import app
from app.mafia.store import store

client = TestClient(app)


def setup_function():
    store.clear()


def _room_with(players: list[str], player_count: int = 4) -> tuple[str, list[str]]:
    room_id = client.post("/mafia/rooms", json={"player_count": player_count}).json()["room_id"]
    ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": name}).json()["player_id"]
        for name in players
    ]
    return room_id, ids


def test_host_leaving_closes_the_room():
    room_id, (host, _guest) = _room_with(["방장", "손님"])

    res = client.post(f"/mafia/rooms/{room_id}/leave", json={"player_id": host})

    assert res.status_code == 200
    assert res.json()["status"] == "room_closed"
    assert not store.exists(room_id)


def test_everyone_else_is_told_the_room_is_gone():
    """The other players' clients poll this; a 404 is what makes them reset."""
    room_id, (host, _guest) = _room_with(["방장", "손님"])

    client.post(f"/mafia/rooms/{room_id}/leave", json={"player_id": host})

    assert client.get(f"/mafia/rooms/{room_id}/state").status_code == 404


def test_a_guest_leaving_keeps_the_room_for_the_others():
    room_id, (host, guest) = _room_with(["방장", "손님"])

    res = client.post(f"/mafia/rooms/{room_id}/leave", json={"player_id": guest})

    assert res.json()["status"] == "left"
    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert [p["player_id"] for p in state["players"]] == [host]


def test_the_last_player_out_closes_the_room():
    room_id, (host, guest) = _room_with(["방장", "손님"])

    client.post(f"/mafia/rooms/{room_id}/leave", json={"player_id": guest})
    client.post(f"/mafia/rooms/{room_id}/leave", json={"player_id": host})

    assert not store.exists(room_id)


def test_leaving_a_room_that_is_already_closed_still_succeeds():
    """Two people can press the button at once; neither should see an error."""
    room_id, (host, _guest) = _room_with(["방장", "손님"])
    client.post(f"/mafia/rooms/{room_id}/leave", json={"player_id": host})

    res = client.post(f"/mafia/rooms/{room_id}/leave", json={"player_id": host})

    assert res.status_code == 200
    assert res.json()["status"] == "already_closed"


def test_an_outsider_cannot_close_someone_elses_room():
    room_id, _ = _room_with(["방장", "손님"])

    res = client.post(f"/mafia/rooms/{room_id}/leave", json={"player_id": "not-a-player"})

    assert res.json()["status"] == "not_in_room"
    assert store.exists(room_id)


def test_a_room_left_mid_game_is_gone_too():
    """Quitting is not only a waiting-room thing — the reset must work from
    inside a running game, which is where the button actually lives."""
    room_id, ids = _room_with(["방장", "손님"], player_count=4)
    client.post(f"/mafia/rooms/{room_id}/fill-test-players")
    client.post(f"/mafia/rooms/{room_id}/persona/mock")
    client.post(f"/mafia/rooms/{room_id}/start")

    client.post(f"/mafia/rooms/{room_id}/leave", json={"player_id": ids[0]})

    assert not store.exists(room_id)
