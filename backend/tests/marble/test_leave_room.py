"""Leaving a marble room has to leave nothing behind — same promise the mafia
game makes, and for the same reason: '게임 선택으로 돌아가기' means the next
game starts from an empty room with fresh invites."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.marble.store import store


@pytest.fixture(autouse=True)
def clean_store():
    store.clear()
    yield
    store.clear()


@pytest.fixture
def client():
    return TestClient(app)


def _room_with(client, names: list[str]) -> tuple[str, list[str]]:
    room_id = client.post(
        "/marble/rooms", json={"content_mode": "general", "max_players": len(names)}
    ).json()["room_id"]
    ids = [
        client.post(f"/marble/rooms/{room_id}/join", json={"nickname": name}).json()["player_id"]
        for name in names
    ]
    return room_id, ids


def test_host_leaving_closes_the_room(client):
    room_id, (host, _guest) = _room_with(client, ["민수", "지은"])

    res = client.post(f"/marble/rooms/{room_id}/leave", json={"player_id": host})

    assert res.json()["status"] == "room_closed"
    assert not store.exists(room_id)
    assert client.get(f"/marble/rooms/{room_id}/state").status_code == 404


def test_a_guest_leaving_drops_them_from_the_turn_order(client):
    """A player left in the turn order but not in the room would hand the dice
    to nobody when their turn came round."""
    room_id, (host, guest) = _room_with(client, ["민수", "지은"])

    client.post(f"/marble/rooms/{room_id}/leave", json={"player_id": guest})

    room = store.get(room_id)
    assert guest not in room.players
    assert guest not in room.turn_order
    assert room.turn_order == [host]


def test_the_last_player_out_closes_the_room(client):
    room_id, (host, guest) = _room_with(client, ["민수", "지은"])

    client.post(f"/marble/rooms/{room_id}/leave", json={"player_id": guest})
    client.post(f"/marble/rooms/{room_id}/leave", json={"player_id": host})

    assert not store.exists(room_id)


def test_leaving_twice_still_succeeds(client):
    room_id, (host, _guest) = _room_with(client, ["민수", "지은"])
    client.post(f"/marble/rooms/{room_id}/leave", json={"player_id": host})

    res = client.post(f"/marble/rooms/{room_id}/leave", json={"player_id": host})

    assert res.status_code == 200
    assert res.json()["status"] == "already_closed"


def test_an_outsider_cannot_close_someone_elses_room(client):
    room_id, _ = _room_with(client, ["민수", "지은"])

    res = client.post(f"/marble/rooms/{room_id}/leave", json={"player_id": "nope"})

    assert res.json()["status"] == "not_in_room"
    assert store.exists(room_id)


def test_a_room_left_mid_game_is_gone_too(client):
    room_id, ids = _room_with(client, ["민수", "지은"])
    client.post(f"/marble/rooms/{room_id}/start")

    client.post(f"/marble/rooms/{room_id}/leave", json={"player_id": ids[0]})

    assert not store.exists(room_id)
