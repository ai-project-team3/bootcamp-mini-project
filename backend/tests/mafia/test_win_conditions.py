from app.mafia.models.room import Room, Player
from app.mafia.game.win_conditions import check_win_condition


def _room_with(roles_alive: list[str], roles_dead: list[str] = ()) -> Room:
    room = Room(room_id="r1", player_count=len(roles_alive) + len(roles_dead))
    for i, role in enumerate(roles_alive):
        pid = f"alive_{i}"
        room.players[pid] = Player(player_id=pid, nickname=pid, role=role, is_alive=True)
    for i, role in enumerate(roles_dead):
        pid = f"dead_{i}"
        room.players[pid] = Player(player_id=pid, nickname=pid, role=role, is_alive=False)
    return room


def test_citizen_team_wins_when_no_mafia_alive():
    room = _room_with(["police", "doctor", "citizen"], roles_dead=["mafia"])
    assert check_win_condition(room) == "citizen"


def test_mafia_wins_when_mafia_count_equals_others_count():
    room = _room_with(["mafia", "citizen"])
    assert check_win_condition(room) == "mafia"


def test_mafia_wins_when_mafia_outnumbers_others():
    room = _room_with(["mafia", "mafia", "citizen"])
    assert check_win_condition(room) == "mafia"


def test_no_winner_when_mafia_is_outnumbered():
    room = _room_with(["mafia", "police", "doctor", "citizen"])
    assert check_win_condition(room) is None
