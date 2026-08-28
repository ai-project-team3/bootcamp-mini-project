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


def create_room(client, content_mode="general") -> str:
    res = client.post("/marble/rooms", json={"content_mode": content_mode})
    assert res.status_code == 200
    return res.json()["room_id"]


def join(client, room_id, nickname):
    res = client.post(f"/marble/rooms/{room_id}/join", json={"nickname": nickname})
    assert res.status_code == 200
    return res.json()


def started_room(client, content_mode="general"):
    room_id = create_room(client, content_mode)
    a = join(client, room_id, "민수")
    b = join(client, room_id, "지은")
    assert client.post(f"/marble/rooms/{room_id}/start").status_code == 200
    return room_id, a, b


class TestCreateAndJoin:
    def test_creates_a_room_with_the_requested_mode(self, client):
        room_id = create_room(client, "adult")
        state = client.get(f"/marble/rooms/{room_id}/state").json()
        assert state["content_mode"] == "adult"
        assert state["phase"] == "WAITING"

    def test_rejects_an_unknown_content_mode(self, client):
        assert client.post("/marble/rooms", json={"content_mode": "nope"}).status_code == 422

    def test_first_player_to_join_becomes_host(self, client):
        room_id = create_room(client)
        a = join(client, room_id, "민수")
        b = join(client, room_id, "지은")
        assert a["is_host"] is True
        assert b["is_host"] is False

    def test_room_holds_only_two_players(self, client):
        room_id = create_room(client)
        join(client, room_id, "민수")
        join(client, room_id, "지은")
        res = client.post(f"/marble/rooms/{room_id}/join", json={"nickname": "제삼자"})
        assert res.status_code == 400

    def test_unknown_room_is_404(self, client):
        assert client.get("/marble/rooms/does-not-exist/state").status_code == 404


class TestStart:
    def test_cannot_start_before_the_room_is_full(self, client):
        room_id = create_room(client)
        join(client, room_id, "민수")
        assert client.post(f"/marble/rooms/{room_id}/start").status_code == 400

    def test_start_deals_a_board_and_opens_the_first_turn(self, client):
        room_id, a, _ = started_room(client)
        state = client.get(f"/marble/rooms/{room_id}/state").json()
        assert state["phase"] == "ROLL_DICE"
        assert len(state["board"]) == 12
        assert state["current_player_id"] == a["player_id"]
        assert len(state["players"]) == 2


class TestTurnEnforcement:
    def test_player_off_turn_cannot_roll(self, client):
        room_id, _, b = started_room(client)
        res = client.post(f"/marble/rooms/{room_id}/roll", json={"player_id": b["player_id"]})
        assert res.status_code == 409

    def test_player_on_turn_can_roll(self, client):
        room_id, a, _ = started_room(client)
        res = client.post(f"/marble/rooms/{room_id}/roll", json={"player_id": a["player_id"]})
        assert res.status_code == 200

    def test_cannot_answer_before_a_quiz_is_open(self, client):
        room_id, a, _ = started_room(client)
        res = client.post(
            f"/marble/rooms/{room_id}/answer", json={"player_id": a["player_id"], "choice_index": 0}
        )
        assert res.status_code == 409


class TestStateLeakage:
    def test_state_never_exposes_the_correct_answer(self, client):
        room_id, a, _ = started_room(client)
        # Roll until a quiz opens (landing on START skips it and passes the turn).
        for _ in range(20):
            state = client.get(f"/marble/rooms/{room_id}/state").json()
            if state["quiz"] is not None:
                break
            current = state["current_player_id"]
            client.post(f"/marble/rooms/{room_id}/roll", json={"player_id": current})

        state = client.get(f"/marble/rooms/{room_id}/state").json()
        assert state["quiz"] is not None, "expected a quiz to open within 20 rolls"
        assert "correct_index" not in state["quiz"]
        assert "correct_index" not in str(state)
        assert len(state["quiz"]["choices"]) == 4


class TestPlayThrough:
    def test_a_full_game_reaches_a_winner_without_a_turn_limit(self, client):
        """Answering every quiz correctly must eventually complete a lap."""
        room_id, _, _ = started_room(client)

        for _ in range(400):
            state = client.get(f"/marble/rooms/{room_id}/state").json()
            if state["phase"] == "GAME_OVER":
                break
            current = state["current_player_id"]

            if state["phase"] == "ROLL_DICE":
                client.post(f"/marble/rooms/{room_id}/roll", json={"player_id": current})
            elif state["phase"] == "SHOW_QUIZ":
                # Brute-force the correct choice: wrong answers simply cost a turn.
                client.post(
                    f"/marble/rooms/{room_id}/answer",
                    json={"player_id": current, "choice_index": 0},
                )
            elif state["phase"] == "SUBMIT_ANSWER":
                client.post(f"/marble/rooms/{room_id}/forfeit-done", json={"player_id": current})

        state = client.get(f"/marble/rooms/{room_id}/state").json()
        assert state["phase"] == "GAME_OVER"
        assert state["winner_id"] is not None
        assert state["chemistry_summary"]

    def test_restart_returns_the_room_to_waiting_with_the_same_players(self, client):
        room_id, a, b = started_room(client)
        assert client.post(f"/marble/rooms/{room_id}/restart").status_code == 200
        state = client.get(f"/marble/rooms/{room_id}/state").json()
        assert state["phase"] == "WAITING"
        assert len(state["players"]) == 2
        assert state["winner_id"] is None
        assert all(p["score"] == 0 and p["steps_moved"] == 0 for p in state["players"])
