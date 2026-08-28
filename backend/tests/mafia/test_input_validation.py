"""Regression tests for the input-validation gaps found in the 2026-08-28 audit.

Before these checks existed, `/vote` and `/night-action` trusted whatever ids
and action types the client sent. That let a client crash the room, let a
citizen kill someone, and let anyone learn another player's role.
"""

from fastapi.testclient import TestClient

from app.main import app
from app.mafia.store import store

BASE = "/mafia/rooms"


def setup_function():
    store.clear()


def _room_at_day_vote(player_count: int = 4):
    client = TestClient(app)
    room_id = client.post(BASE, json={"player_count": player_count}).json()["room_id"]
    player_ids = [
        client.post(f"{BASE}/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(player_count)
    ]
    client.post(f"{BASE}/{room_id}/persona/mock?seed=1")
    client.post(f"{BASE}/{room_id}/start")
    client.post(f"{BASE}/{room_id}/advance")  # -> DAY_DISCUSSION
    client.post(f"{BASE}/{room_id}/advance")  # -> DAY_VOTE
    return client, room_id, player_ids


def _roles(client, room_id, player_ids):
    return {
        pid: client.get(f"{BASE}/{room_id}/players/{pid}/me").json()["role"]
        for pid in player_ids
    }


def test_voting_for_an_unknown_player_is_rejected():
    """A bogus target used to be accepted, then crashed the room on tally."""
    client, room_id, player_ids = _room_at_day_vote()

    resp = client.post(
        f"{BASE}/{room_id}/vote",
        json={"voter_id": player_ids[0], "target_id": "NOT-A-REAL-PLAYER"},
    )
    assert resp.status_code == 404

    # The room is still playable.
    assert client.post(f"{BASE}/{room_id}/advance").status_code == 200


def test_a_player_outside_the_room_cannot_vote():
    client, room_id, player_ids = _room_at_day_vote()

    resp = client.post(
        f"{BASE}/{room_id}/vote",
        json={"voter_id": "OUTSIDER", "target_id": player_ids[0]},
    )
    assert resp.status_code == 404


def test_a_citizen_cannot_submit_a_kill():
    client, room_id, player_ids = _room_at_day_vote()
    client.post(f"{BASE}/{room_id}/advance")  # DAY_VOTE -> NIGHT_ACTION (no votes)
    assert client.get(f"{BASE}/{room_id}/state").json()["phase"] == "NIGHT_ACTION"

    roles = _roles(client, room_id, player_ids)
    citizen = next(pid for pid, role in roles.items() if role == "citizen")
    victim = next(pid for pid, role in roles.items() if role == "police")

    resp = client.post(
        f"{BASE}/{room_id}/night-action",
        json={"actor_id": citizen, "action_type": "kill", "target_id": victim},
    )
    assert resp.status_code == 403

    client.post(f"{BASE}/{room_id}/advance")
    state = client.get(f"{BASE}/{room_id}/state").json()
    still_alive = {p["player_id"]: p["is_alive"] for p in state["players"]}
    assert still_alive[victim] is True


def test_only_the_police_can_investigate():
    client, room_id, player_ids = _room_at_day_vote()
    client.post(f"{BASE}/{room_id}/advance")

    roles = _roles(client, room_id, player_ids)
    snoop = next(pid for pid, role in roles.items() if role == "citizen")
    mafia = next(pid for pid, role in roles.items() if role == "mafia")

    resp = client.post(
        f"{BASE}/{room_id}/night-action",
        json={"actor_id": snoop, "action_type": "investigate", "target_id": mafia},
    )
    assert resp.status_code == 403
    assert client.get(f"{BASE}/{room_id}/players/{snoop}/me").json()["investigation_result"] is None


def test_the_police_can_investigate():
    client, room_id, player_ids = _room_at_day_vote()
    client.post(f"{BASE}/{room_id}/advance")

    roles = _roles(client, room_id, player_ids)
    police = next(pid for pid, role in roles.items() if role == "police")
    mafia = next(pid for pid, role in roles.items() if role == "mafia")

    resp = client.post(
        f"{BASE}/{room_id}/night-action",
        json={"actor_id": police, "action_type": "investigate", "target_id": mafia},
    )
    assert resp.status_code == 200
    assert resp.json()["investigation_result"]["is_mafia"] is True


def test_an_eliminated_player_cannot_act_at_night():
    client, room_id, player_ids = _room_at_day_vote(player_count=6)
    roles = _roles(client, room_id, player_ids)
    doctor = next(pid for pid, role in roles.items() if role == "doctor")

    # Vote the doctor out.
    for voter_id in player_ids:
        client.post(f"{BASE}/{room_id}/vote", json={"voter_id": voter_id, "target_id": doctor})
    client.post(f"{BASE}/{room_id}/advance")  # -> FINAL_DEFENSE
    client.post(f"{BASE}/{room_id}/advance")  # -> EXECUTION_VOTE
    for voter_id in (pid for pid in player_ids if pid != doctor):
        client.post(f"{BASE}/{room_id}/execution-vote", json={"voter_id": voter_id, "verdict": "guilty"})
    phase = client.post(f"{BASE}/{room_id}/advance").json()["phase"]
    assert phase == "NIGHT_ACTION"

    alive = [p["player_id"] for p in client.get(f"{BASE}/{room_id}/state").json()["players"] if p["is_alive"]]
    resp = client.post(
        f"{BASE}/{room_id}/night-action",
        json={"actor_id": doctor, "action_type": "protect", "target_id": alive[0]},
    )
    assert resp.status_code == 400


def test_an_eliminated_player_cannot_vote():
    client, room_id, player_ids = _room_at_day_vote(player_count=6)
    roles = _roles(client, room_id, player_ids)
    doctor = next(pid for pid, role in roles.items() if role == "doctor")

    for voter_id in player_ids:
        client.post(f"{BASE}/{room_id}/vote", json={"voter_id": voter_id, "target_id": doctor})
    client.post(f"{BASE}/{room_id}/advance")
    client.post(f"{BASE}/{room_id}/advance")
    for voter_id in (pid for pid in player_ids if pid != doctor):
        client.post(f"{BASE}/{room_id}/execution-vote", json={"voter_id": voter_id, "verdict": "guilty"})
    client.post(f"{BASE}/{room_id}/advance")  # -> NIGHT_ACTION
    client.post(f"{BASE}/{room_id}/advance")  # -> DAY_DISCUSSION
    client.post(f"{BASE}/{room_id}/advance")  # -> DAY_VOTE

    survivor = next(pid for pid in player_ids if pid != doctor)
    resp = client.post(
        f"{BASE}/{room_id}/vote",
        json={"voter_id": doctor, "target_id": survivor},
    )
    assert resp.status_code == 400


def test_room_codes_are_short_and_unambiguous():
    client = TestClient(app)
    code = client.post(BASE, json={"player_count": 4}).json()["room_id"]
    assert len(code) == 6
    assert code.isupper() or code.isdigit()
    assert not set(code) & set("0O1I")


def test_blank_nickname_is_rejected():
    client = TestClient(app)
    room_id = client.post(BASE, json={"player_count": 4}).json()["room_id"]
    assert client.post(f"{BASE}/{room_id}/join", json={"nickname": "   "}).status_code == 400
