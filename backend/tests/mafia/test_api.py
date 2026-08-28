from fastapi.testclient import TestClient

from app.standalone import app
from app.mafia.store import store
from app.mafia.game import state_machine
from app.mafia.models.room import GamePhase
from app.mafia.persona.provider import MockPersonaProvider


def setup_function():
    store.clear()


def _persona_payload(player_ids: list[str], seed: int) -> dict:
    personas = MockPersonaProvider(seed=seed).get_personas(player_ids)
    return {
        "players": [
            {
                "playerId": pid,
                "personaScores": {
                    "initiative": p.initiative,
                    "analysis": p.analysis,
                    "empathy": p.empathy,
                    "caution": p.caution,
                },
            }
            for pid, p in personas.items()
        ]
    }


def test_full_game_flow_through_the_api():
    client = TestClient(app)

    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]

    player_ids = []
    for i in range(4):
        resp = client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"})
        player_ids.append(resp.json()["player_id"])

    persona_resp = client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=1))
    assert persona_resp.status_code == 200

    start_resp = client.post(f"/mafia/rooms/{room_id}/start")
    assert start_resp.json()["phase"] == "ROLE_ASSIGNMENT"

    assert client.post(f"/mafia/rooms/{room_id}/advance").json()["phase"] == "DAY_DISCUSSION"
    assert client.post(f"/mafia/rooms/{room_id}/advance").json()["phase"] == "DAY_VOTE"

    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    alive_ids = [p["player_id"] for p in state["players"]]
    target = alive_ids[0]
    for voter_id in player_ids:
        client.post(f"/mafia/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": target})

    advance_resp = client.post(f"/mafia/rooms/{room_id}/advance").json()
    assert advance_resp["phase"] == "FINAL_DEFENSE"

    advance_resp = client.post(f"/mafia/rooms/{room_id}/advance").json()
    assert advance_resp["phase"] == "EXECUTION_VOTE"

    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    accused_id = state["accused_player_id"]
    assert accused_id == target
    jurors = [pid for pid in player_ids if pid != accused_id]
    for voter_id in jurors:
        client.post(f"/mafia/rooms/{room_id}/execution-vote", json={"voter_id": voter_id, "verdict": "guilty"})

    advance_resp = client.post(f"/mafia/rooms/{room_id}/advance").json()
    assert advance_resp["phase"] in ("NIGHT_ACTION", "RESULT")

    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    accused_player = next(p for p in state["players"] if p["player_id"] == accused_id)
    assert accused_player["is_alive"] is False

    if advance_resp["phase"] == "NIGHT_ACTION":
        result_probe = client.get(f"/mafia/rooms/{room_id}/result")
        assert result_probe.status_code == 400
        state = client.get(f"/mafia/rooms/{room_id}/state").json()
        alive_ids = [p["player_id"] for p in state["players"] if p["is_alive"]]
        # 습격은 살아있는 마피아만 보낼 수 있다 (다른 역할이 보내면 403).
        roles = {
            pid: client.get(f"/mafia/rooms/{room_id}/players/{pid}/me").json()["role"]
            for pid in alive_ids
        }
        killer_id = next(pid for pid in alive_ids if roles[pid] == "mafia")
        victim_id = next(pid for pid in alive_ids if roles[pid] != "mafia")
        target_nickname = next(p["nickname"] for p in state["players"] if p["player_id"] == victim_id)
        attack = client.post(
            f"/mafia/rooms/{room_id}/night-action",
            json={"actor_id": killer_id, "action_type": "kill", "target_id": victim_id},
        )
        assert attack.status_code == 200
        advance_resp = client.post(f"/mafia/rooms/{room_id}/advance").json()
        state = client.get(f"/mafia/rooms/{room_id}/state").json()
        assert state["night_summary"] == {"attacked_nickname": target_nickname, "died": True}

    assert advance_resp["phase"] == "RESULT"
    result = client.get(f"/mafia/rooms/{room_id}/result").json()
    assert result["winner"] in {"mafia", "citizen"}
    assert len(result["players"]) == 4
    for p in result["players"]:
        assert p["role"] in {"mafia", "police", "doctor", "citizen"}

    restart_resp = client.post(f"/mafia/rooms/{room_id}/restart")
    assert restart_resp.json()["phase"] == "WAITING_ROOM"
    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert state["phase"] == "WAITING_ROOM"
    assert state["player_count"] == 4
    assert len(state["players"]) == 4
    assert state["personas_ready"] is False


def test_result_includes_persona_scores_for_the_radar_chart():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=9))
    client.post(f"/mafia/rooms/{room_id}/start")
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_DISCUSSION
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_VOTE
    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    target = state["players"][0]["player_id"]
    for voter_id in player_ids:
        client.post(f"/mafia/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": target})
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> FINAL_DEFENSE
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> EXECUTION_VOTE
    jurors = [pid for pid in player_ids if pid != target]
    for voter_id in jurors:
        client.post(f"/mafia/rooms/{room_id}/execution-vote", json={"voter_id": voter_id, "verdict": "guilty"})
    day_result = client.post(f"/mafia/rooms/{room_id}/advance").json()
    if day_result["phase"] == "NIGHT_ACTION":
        client.post(f"/mafia/rooms/{room_id}/advance")

    result = client.get(f"/mafia/rooms/{room_id}/result").json()
    for p in result["players"]:
        assert set(p["persona_scores"].keys()) == {"initiative", "analysis", "empathy", "caution"}
        for value in p["persona_scores"].values():
            assert 0 <= value <= 100


def test_private_role_and_investigation_result_via_me_endpoint():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=3))
    client.post(f"/mafia/rooms/{room_id}/start")

    roles = {}
    for pid in player_ids:
        me = client.get(f"/mafia/rooms/{room_id}/players/{pid}/me").json()
        assert me["role"] in {"mafia", "police", "doctor", "citizen"}
        assert me["assigned_by"] in {"preference", "fallback_random"}
        assert me["investigation_result"] is None
        roles[pid] = me["role"]
    assert set(roles.values()) == {"mafia", "police", "doctor", "citizen"}

    police_id = next(pid for pid, role in roles.items() if role == "police")
    mafia_id = next(pid for pid, role in roles.items() if role == "mafia")
    bystander_id = next(pid for pid, role in roles.items() if role not in ("mafia", "police"))

    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_DISCUSSION
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_VOTE
    for voter_id in player_ids:
        client.post(f"/mafia/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": bystander_id})
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> FINAL_DEFENSE
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> EXECUTION_VOTE
    jurors = [pid for pid in player_ids if pid != bystander_id]
    for voter_id in jurors:
        client.post(f"/mafia/rooms/{room_id}/execution-vote", json={"voter_id": voter_id, "verdict": "guilty"})
    day_result = client.post(f"/mafia/rooms/{room_id}/advance").json()
    assert day_result["phase"] == "NIGHT_ACTION"

    client.post(
        f"/mafia/rooms/{room_id}/night-action",
        json={"actor_id": police_id, "action_type": "investigate", "target_id": mafia_id},
    )
    client.post(f"/mafia/rooms/{room_id}/advance")

    state_after_night = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert state_after_night["night_summary"] == {"attacked_nickname": None, "died": False}

    police_view = client.get(f"/mafia/rooms/{room_id}/players/{police_id}/me").json()
    assert police_view["investigation_result"] == {
        "police_id": police_id,
        "target_id": mafia_id,
        "is_mafia": True,
    }

    other_alive_id = next(pid for pid in player_ids if pid != police_id and pid != bystander_id)
    other_view = client.get(f"/mafia/rooms/{room_id}/players/{other_alive_id}/me").json()
    assert other_view["investigation_result"] is None


def test_first_joiner_becomes_host_and_state_exposes_it():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]

    first = client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": "a"}).json()
    second = client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": "b"}).json()

    assert first["is_host"] is True
    assert second["is_host"] is False

    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert state["host_player_id"] == first["player_id"]
    assert state["player_count"] == 4
    assert state["personas_ready"] is False
    assert state["phase_deadline"] is None
    assert state["accused_player_id"] is None
    assert state["night_summary"] is None


def test_state_reports_personas_ready_once_all_players_have_persona_data():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    for i in range(4):
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"})

    assert client.get(f"/mafia/rooms/{room_id}/state").json()["personas_ready"] is False

    client.post(f"/mafia/rooms/{room_id}/persona/mock", params={"seed": 1})

    assert client.get(f"/mafia/rooms/{room_id}/state").json()["personas_ready"] is True


def test_fill_test_players_completes_the_room_for_solo_playthrough():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": "host"})

    resp = client.post(f"/mafia/rooms/{room_id}/fill-test-players")
    assert resp.status_code == 200
    assert resp.json()["player_count"] == 4

    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert len(state["players"]) == 4

    client.post(f"/mafia/rooms/{room_id}/persona/mock")
    assert client.get(f"/mafia/rooms/{room_id}/state").json()["personas_ready"] is True

    start_resp = client.post(f"/mafia/rooms/{room_id}/start")
    assert start_resp.json()["phase"] == "ROLE_ASSIGNMENT"


def test_fill_test_players_is_a_noop_when_room_already_full():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    for i in range(4):
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"})

    resp = client.post(f"/mafia/rooms/{room_id}/fill-test-players")

    assert resp.json()["player_count"] == 4
    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert len(state["players"]) == 4


def test_mock_persona_endpoint_fills_all_joined_players():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]

    resp = client.post(f"/mafia/rooms/{room_id}/persona/mock", params={"seed": 5})
    assert resp.status_code == 200

    start_resp = client.post(f"/mafia/rooms/{room_id}/start")
    assert start_resp.json()["phase"] == "ROLE_ASSIGNMENT"
    roles = {pid: client.get(f"/mafia/rooms/{room_id}/players/{pid}/me").json()["role"] for pid in player_ids}
    assert set(roles.values()) == {"mafia", "police", "doctor", "citizen"}


def test_unknown_room_returns_404():
    client = TestClient(app)
    resp = client.get("/mafia/rooms/does-not-exist/state")
    assert resp.status_code == 404


def test_start_without_full_persona_data_returns_400():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    for i in range(4):
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"})

    resp = client.post(f"/mafia/rooms/{room_id}/start")
    assert resp.status_code == 400


def test_vote_cannot_be_changed_after_confirming():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=4))
    client.post(f"/mafia/rooms/{room_id}/start")
    client.post(f"/mafia/rooms/{room_id}/advance")
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_VOTE

    voter, first_target, second_target = player_ids[0], player_ids[1], player_ids[2]
    ok = client.post(f"/mafia/rooms/{room_id}/vote", json={"voter_id": voter, "target_id": first_target})
    assert ok.status_code == 200

    blocked = client.post(f"/mafia/rooms/{room_id}/vote", json={"voter_id": voter, "target_id": second_target})
    assert blocked.status_code == 400


def test_execution_vote_rejects_the_accused_voting_on_themself():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=5))
    client.post(f"/mafia/rooms/{room_id}/start")
    client.post(f"/mafia/rooms/{room_id}/advance")
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_VOTE
    target = player_ids[0]
    for voter_id in player_ids:
        client.post(f"/mafia/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": target})
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> FINAL_DEFENSE
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> EXECUTION_VOTE

    resp = client.post(f"/mafia/rooms/{room_id}/execution-vote", json={"voter_id": target, "verdict": "guilty"})
    assert resp.status_code == 400


def test_restart_requires_result_phase():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    resp = client.post(f"/mafia/rooms/{room_id}/restart")
    assert resp.status_code == 400


def test_restart_resets_room_to_waiting_room_keeping_players_and_host():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=2))
    client.post(f"/mafia/rooms/{room_id}/start")
    room = store.get(room_id)
    room.phase = GamePhase.RESULT
    room.winner = "citizen"

    resp = client.post(f"/mafia/rooms/{room_id}/restart")
    assert resp.json()["phase"] == "WAITING_ROOM"

    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert state["phase"] == "WAITING_ROOM"
    assert state["host_player_id"] == player_ids[0]
    assert len(state["players"]) == 4
    assert state["personas_ready"] is False


def test_get_state_auto_advances_when_deadline_has_passed():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=6))
    client.post(f"/mafia/rooms/{room_id}/start")

    room = store.get(room_id)
    assert room.phase == GamePhase.ROLE_ASSIGNMENT
    room.phase_deadline = 0  # 이미 지난 시각으로 강제 설정

    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert state["phase"] == "DAY_DISCUSSION"


def test_get_state_auto_advances_early_when_all_alive_players_confirm_their_vote():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=8))
    client.post(f"/mafia/rooms/{room_id}/start")
    client.post(f"/mafia/rooms/{room_id}/advance")
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_VOTE

    target = player_ids[0]
    for voter_id in player_ids:
        client.post(f"/mafia/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": target})

    # 타이머는 아직 넉넉히 남아 있지만 전원이 완료했으므로 즉시 다음 단계로 넘어가야 한다
    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert state["phase"] == "FINAL_DEFENSE"
    assert state["accused_player_id"] == target


def test_host_can_update_player_count_while_in_waiting_room():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": "host"})

    resp = client.post(f"/mafia/rooms/{room_id}/player-count", json={"player_count": 6})

    assert resp.status_code == 200
    assert resp.json()["player_count"] == 6
    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert state["player_count"] == 6


def test_player_count_update_rejects_invalid_values():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]

    resp = client.post(f"/mafia/rooms/{room_id}/player-count", json={"player_count": 9})

    assert resp.status_code == 400
    assert "4, 5, 6, 7, 8" in resp.json()["detail"]


def test_player_count_update_rejects_shrinking_below_current_headcount():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 6}).json()["room_id"]
    for i in range(5):
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"})

    resp = client.post(f"/mafia/rooms/{room_id}/player-count", json={"player_count": 4})

    assert resp.status_code == 400
    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert state["player_count"] == 6


def test_player_count_update_rejected_outside_waiting_room():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=11))
    client.post(f"/mafia/rooms/{room_id}/start")

    resp = client.post(f"/mafia/rooms/{room_id}/player-count", json={"player_count": 5})

    assert resp.status_code == 400


def test_state_exposes_execution_result_after_a_guilty_verdict():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=12))
    client.post(f"/mafia/rooms/{room_id}/start")
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_DISCUSSION
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_VOTE
    target = player_ids[0]
    target_nickname = client.get(f"/mafia/rooms/{room_id}/state").json()["players"][0]["nickname"]
    for voter_id in player_ids:
        client.post(f"/mafia/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": target})
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> FINAL_DEFENSE
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> EXECUTION_VOTE
    jurors = [pid for pid in player_ids if pid != target]
    for voter_id in jurors:
        client.post(f"/mafia/rooms/{room_id}/execution-vote", json={"voter_id": voter_id, "verdict": "guilty"})
    client.post(f"/mafia/rooms/{room_id}/advance")

    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert state["execution_result"] == {"nickname": target_nickname, "executed": True}


def test_investigate_action_returns_result_immediately_same_night():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=13))
    client.post(f"/mafia/rooms/{room_id}/start")

    roles = {pid: client.get(f"/mafia/rooms/{room_id}/players/{pid}/me").json()["role"] for pid in player_ids}
    police_id = next(pid for pid, role in roles.items() if role == "police")
    mafia_id = next(pid for pid, role in roles.items() if role == "mafia")

    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_DISCUSSION
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_VOTE
    bystander_id = next(pid for pid in player_ids if pid not in (police_id, mafia_id))
    for voter_id in player_ids:
        client.post(f"/mafia/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": bystander_id})
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> FINAL_DEFENSE
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> EXECUTION_VOTE
    jurors = [pid for pid in player_ids if pid != bystander_id]
    for voter_id in jurors:
        client.post(f"/mafia/rooms/{room_id}/execution-vote", json={"voter_id": voter_id, "verdict": "innocent"})
    day_result = client.post(f"/mafia/rooms/{room_id}/advance").json()
    assert day_result["phase"] == "NIGHT_ACTION"

    resp = client.post(
        f"/mafia/rooms/{room_id}/night-action",
        json={"actor_id": police_id, "action_type": "investigate", "target_id": mafia_id},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["investigation_result"] == {
        "police_id": police_id,
        "target_id": mafia_id,
        "is_mafia": True,
    }
    state = client.get(f"/mafia/rooms/{room_id}/state").json()
    assert state["phase"] == "NIGHT_ACTION"


def test_night_action_response_omits_investigation_result_for_kill():
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=14))
    client.post(f"/mafia/rooms/{room_id}/start")
    roles = {pid: client.get(f"/mafia/rooms/{room_id}/players/{pid}/me").json()["role"] for pid in player_ids}
    mafia_id = next(pid for pid, role in roles.items() if role == "mafia")
    victim_id = next(pid for pid, role in roles.items() if role != "mafia")

    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_DISCUSSION
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> DAY_VOTE
    for voter_id in player_ids:
        client.post(f"/mafia/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": victim_id})
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> FINAL_DEFENSE
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> EXECUTION_VOTE
    client.post(f"/mafia/rooms/{room_id}/advance")  # -> NIGHT_ACTION (nobody votes -> spared)

    resp = client.post(
        f"/mafia/rooms/{room_id}/night-action",
        json={"actor_id": mafia_id, "action_type": "kill", "target_id": victim_id},
    )

    assert resp.status_code == 200
    assert "investigation_result" not in resp.json()


def test_get_state_survives_a_concurrent_phase_transition_race(monkeypatch):
    """두 브라우저 탭이 동시에 GET /state를 폴링하다 마감 시각이 지난 순간을
    맞으면, 한쪽 요청의 tick()이 전이를 완료한 직후 다른 쪽 요청이 (이미
    낡아버린) 같은 전이 함수를 호출해 InvalidPhaseTransition을 던질 수 있다
    (RoomStore에는 락이 없고, FastAPI가 sync 핸들러를 스레드풀에서 실행하기
    때문). get_state는 이 예외를 삼키고 현재 phase로 정상 응답해야 한다.

    실제 스레드 경합은 타이밍에 좌우되므로, tick()이 고른 전이 함수를 같은
    호출 안에서 두 번 실행하도록 바꿔치기해 그 경합의 결과(전이 함수가 이미
    바뀐 phase를 보고 예외를 던지는 상황)를 결정적으로 재현한다.
    """
    client = TestClient(app)
    room_id = client.post("/mafia/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/mafia/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/mafia/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=9))
    client.post(f"/mafia/rooms/{room_id}/start")

    room = store.get(room_id)
    assert room.phase == GamePhase.ROLE_ASSIGNMENT
    room.phase_deadline = 0  # 이미 지난 시각으로 강제 설정 -> tick()이 begin_discussion을 호출하려 함

    original_begin_discussion = state_machine.begin_discussion

    def racy_begin_discussion(r):
        # 첫 호출: "이긴" 동시 요청이 먼저 전이를 완료해버린 상황을 흉내낸다.
        original_begin_discussion(r)
        # 두 번째 호출: 이 요청이 들고 있던 (이미 낡은) transition 참조로
        # 다시 호출 -> phase가 이미 바뀌어 있으므로 InvalidPhaseTransition 발생.
        original_begin_discussion(r)

    # tick()은 _DEADLINE_TRANSITIONS 딕셔너리에서 조회한 함수 참조를 직접
    # 호출하므로, 그 딕셔너리 항목을 바꿔치기해야 tick() 경로에 실제로 반영된다.
    monkeypatch.setitem(state_machine._DEADLINE_TRANSITIONS, GamePhase.ROLE_ASSIGNMENT, racy_begin_discussion)

    response = client.get(f"/mafia/rooms/{room_id}/state")

    assert response.status_code == 200
    assert response.json()["phase"] == "DAY_DISCUSSION"
