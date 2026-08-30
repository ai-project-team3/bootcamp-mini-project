from app.mafia.models.room import GamePhase, Player, Room


def test_room_starts_in_waiting_room_phase_with_no_players():
    room = Room(room_id="r1", player_count=4)
    assert room.phase == GamePhase.WAITING_ROOM
    assert room.players == {}
    assert room.day_number == 0
    assert room.night_number == 0
    assert room.winner is None
    assert room.host_player_id is None


def test_player_starts_alive_with_no_role():
    player = Player(player_id="p1", nickname="정글짐")
    assert player.is_alive is True
    assert player.role is None
    assert player.assigned_score is None
    assert player.assigned_by is None


def test_room_can_hold_players_and_personas_independently():
    room = Room(room_id="r1", player_count=4)
    room.players["p1"] = Player(player_id="p1", nickname="정글짐")
    assert "p1" in room.players
    assert room.personas == {}


def test_room_starts_with_no_deadline_or_accusation_and_empty_execution_vote_tracking():
    room = Room(room_id="r1", player_count=4)
    assert room.phase_deadline is None
    assert room.accused_player_id is None
    assert room.votes_confirmed == set()
    assert room.execution_votes == {}
    assert room.execution_confirmed == set()


def test_game_phase_includes_final_defense_and_execution_vote():
    assert GamePhase.FINAL_DEFENSE.value == "FINAL_DEFENSE"
    assert GamePhase.EXECUTION_VOTE.value == "EXECUTION_VOTE"


def test_room_starts_with_no_night_summary():
    room = Room(room_id="r1", player_count=4)
    assert room.night_summary is None
