import random

from app.mafia.models.room import Room, Player
from app.mafia.game.night_actions import resolve_night_actions


def _room_with_players(*ids: str) -> Room:
    room = Room(room_id="r1", player_count=len(ids))
    for pid in ids:
        room.players[pid] = Player(player_id=pid, nickname=pid)
    return room


def test_mafia_kill_without_protection_kills_target():
    room = _room_with_players("mafia1", "victim")
    room.night_actions = {"mafia1": ("kill", "victim")}

    killed = resolve_night_actions(room)

    assert killed == "victim"
    assert room.players["victim"].is_alive is False


def test_doctor_protection_saves_the_kill_target():
    room = _room_with_players("mafia1", "doctor1", "victim")
    room.night_actions = {
        "mafia1": ("kill", "victim"),
        "doctor1": ("protect", "victim"),
    }

    killed = resolve_night_actions(room)

    assert killed is None
    assert room.players["victim"].is_alive is True


def test_police_investigation_reports_whether_target_is_mafia():
    room = _room_with_players("police1", "mafia1")
    room.players["mafia1"].role = "mafia"
    room.night_actions = {"police1": ("investigate", "mafia1")}

    resolve_night_actions(room)

    assert room.investigation_result == {
        "police_id": "police1",
        "target_id": "mafia1",
        "is_mafia": True,
    }


def test_no_night_actions_kills_nobody():
    room = _room_with_players("a", "b")
    killed = resolve_night_actions(room)
    assert killed is None
    assert room.players["a"].is_alive is True
    assert room.players["b"].is_alive is True


def test_multiple_mafia_kill_votes_break_ties_randomly():
    room = _room_with_players("mafia1", "mafia2", "x", "y")
    room.night_actions = {"mafia1": ("kill", "x"), "mafia2": ("kill", "y")}

    killed = resolve_night_actions(room, rng=random.Random(0))

    assert killed in {"x", "y"}
    assert room.players[killed].is_alive is False


def test_night_summary_reports_no_attack_when_nobody_acted():
    room = _room_with_players("a", "b")
    resolve_night_actions(room)
    assert room.night_summary == {"attacked_nickname": None, "died": False}


def test_night_summary_reports_the_victim_died_when_unprotected():
    room = _room_with_players("mafia1", "victim")
    room.night_actions = {"mafia1": ("kill", "victim")}

    resolve_night_actions(room)

    assert room.night_summary == {"attacked_nickname": "victim", "died": True}


def test_night_summary_reports_the_victim_survived_when_protected():
    room = _room_with_players("mafia1", "doctor1", "victim")
    room.night_actions = {
        "mafia1": ("kill", "victim"),
        "doctor1": ("protect", "victim"),
    }

    resolve_night_actions(room)

    assert room.night_summary == {"attacked_nickname": "victim", "died": False}
