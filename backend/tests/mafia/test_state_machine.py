import random
import time

import pytest

from app.mafia.models.room import Room, Player, GamePhase
from app.mafia.game.state_machine import (
    start_game,
    begin_discussion,
    open_vote,
    resolve_day,
    resolve_final_defense,
    resolve_execution_vote,
    resolve_night,
    restart_room,
    tick,
    InvalidPhaseTransition,
)
from app.mafia.persona.provider import MockPersonaProvider


def _new_room(player_count: int) -> Room:
    room = Room(room_id="r1", player_count=player_count)
    for i in range(player_count):
        pid = f"p{i}"
        room.players[pid] = Player(player_id=pid, nickname=pid)
    return room


def test_start_game_assigns_roles_and_moves_to_role_assignment_phase():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))

    start_game(room, personas, rng=random.Random(1))

    assert room.phase == GamePhase.ROLE_ASSIGNMENT
    roles = [p.role for p in room.players.values()]
    assert sorted(roles) == ["citizen", "doctor", "mafia", "police"]
    for player in room.players.values():
        assert player.assigned_score is not None
        assert player.assigned_by in {"preference", "fallback_random"}


def test_start_game_sets_a_role_assignment_deadline():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    before = time.time()

    start_game(room, personas, rng=random.Random(1))

    assert room.phase_deadline is not None
    assert room.phase_deadline > before


def test_start_game_rejects_wrong_phase():
    room = _new_room(4)
    room.phase = GamePhase.DAY_DISCUSSION
    with pytest.raises(InvalidPhaseTransition):
        start_game(room, {})


def test_full_happy_path_reaches_result_with_a_winner():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=7).get_personas(list(room.players))
    rng = random.Random(7)

    start_game(room, personas, rng=rng)
    begin_discussion(room)
    assert room.phase == GamePhase.DAY_DISCUSSION
    assert room.day_number == 1

    open_vote(room)
    assert room.phase == GamePhase.DAY_VOTE

    non_mafia = next(p for p in room.players.values() if p.role != "mafia")
    for voter_id in room.players:
        room.votes[voter_id] = non_mafia.player_id
    resolve_day(room, rng=rng)

    assert room.phase == GamePhase.FINAL_DEFENSE
    assert room.accused_player_id == non_mafia.player_id

    resolve_final_defense(room)
    assert room.phase == GamePhase.EXECUTION_VOTE

    for voter_id in room.players:
        if voter_id != non_mafia.player_id:
            room.execution_votes[voter_id] = "guilty"
    resolve_execution_vote(room)

    assert room.players[non_mafia.player_id].is_alive is False
    assert room.accused_player_id is None
    assert room.phase in (GamePhase.NIGHT_ACTION, GamePhase.RESULT)

    if room.phase == GamePhase.NIGHT_ACTION:
        mafia = next(p for p in room.players.values() if p.role == "mafia" and p.is_alive)
        target = next(p for p in room.players.values() if p.is_alive and p.role != "mafia")
        room.night_actions[mafia.player_id] = ("kill", target.player_id)
        resolve_night(room, rng=rng)

    assert room.phase == GamePhase.RESULT
    assert room.winner in {"mafia", "citizen"}


def test_resolve_day_with_no_votes_skips_final_defense_and_goes_straight_to_night():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=2).get_personas(list(room.players))
    rng = random.Random(2)
    start_game(room, personas, rng=rng)
    begin_discussion(room)
    open_vote(room)

    resolve_day(room, rng=rng)

    assert room.phase == GamePhase.NIGHT_ACTION
    assert room.accused_player_id is None


def test_resolve_execution_vote_spares_the_accused_on_a_tie():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=3).get_personas(list(room.players))
    rng = random.Random(3)
    start_game(room, personas, rng=rng)
    begin_discussion(room)
    open_vote(room)
    target = next(iter(room.players))
    for voter_id in room.players:
        room.votes[voter_id] = target
    resolve_day(room, rng=rng)
    resolve_final_defense(room)

    jurors = [pid for pid in room.players if pid != target]
    room.execution_votes = {jurors[0]: "guilty", jurors[1]: "innocent"}

    resolve_execution_vote(room)

    assert room.players[target].is_alive is True
    assert room.accused_player_id is None


def test_resolve_execution_vote_records_execution_result_when_executed():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=4).get_personas(list(room.players))
    rng = random.Random(4)
    start_game(room, personas, rng=rng)
    begin_discussion(room)
    open_vote(room)
    target = next(iter(room.players))
    for voter_id in room.players:
        room.votes[voter_id] = target
    resolve_day(room, rng=rng)
    resolve_final_defense(room)
    for voter_id in room.players:
        if voter_id != target:
            room.execution_votes[voter_id] = "guilty"

    resolve_execution_vote(room)

    assert room.execution_result == {"nickname": room.players[target].nickname, "executed": True}


def test_resolve_execution_vote_records_execution_result_when_spared():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=3).get_personas(list(room.players))
    rng = random.Random(3)
    start_game(room, personas, rng=rng)
    begin_discussion(room)
    open_vote(room)
    target = next(iter(room.players))
    for voter_id in room.players:
        room.votes[voter_id] = target
    resolve_day(room, rng=rng)
    resolve_final_defense(room)
    jurors = [pid for pid in room.players if pid != target]
    room.execution_votes = {jurors[0]: "guilty", jurors[1]: "innocent"}

    resolve_execution_vote(room)

    assert room.execution_result == {"nickname": room.players[target].nickname, "executed": False}


def test_resolve_day_clears_stale_execution_result_when_nobody_is_accused():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=2).get_personas(list(room.players))
    rng = random.Random(2)
    start_game(room, personas, rng=rng)
    begin_discussion(room)
    open_vote(room)
    room.execution_result = {"nickname": "leftover", "executed": True}

    resolve_day(room, rng=rng)

    assert room.phase == GamePhase.NIGHT_ACTION
    assert room.execution_result is None


def test_enter_night_clears_a_stale_investigation_result_from_an_earlier_night():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=5).get_personas(list(room.players))
    rng = random.Random(5)
    start_game(room, personas, rng=rng)
    begin_discussion(room)
    open_vote(room)
    room.investigation_result = {"police_id": "p0", "target_id": "p1", "is_mafia": False}

    resolve_day(room, rng=rng)

    assert room.phase == GamePhase.NIGHT_ACTION
    assert room.investigation_result is None


def test_restart_room_resets_state_but_keeps_players_and_host():
    room = _new_room(4)
    room.host_player_id = next(iter(room.players))
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    start_game(room, personas, rng=random.Random(1))
    room.phase = GamePhase.RESULT
    room.winner = "citizen"
    room.night_summary = {"attacked_nickname": "p0", "died": True}
    room.execution_result = {"nickname": "p0", "executed": True}

    restart_room(room)

    assert room.phase == GamePhase.WAITING_ROOM
    assert room.winner is None
    assert room.phase_deadline is None
    assert room.night_summary is None
    assert room.execution_result is None
    assert room.personas == {}
    assert len(room.players) == 4
    assert room.host_player_id is not None
    for player in room.players.values():
        assert player.role is None
        assert player.assigned_score is None
        assert player.assigned_by is None
        assert player.is_alive is True


def test_restart_room_rejects_non_result_phase():
    room = _new_room(4)
    with pytest.raises(InvalidPhaseTransition):
        restart_room(room)


def test_tick_does_nothing_before_the_deadline():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    start_game(room, personas, rng=random.Random(1))
    room.phase_deadline = time.time() + 999

    tick(room)

    assert room.phase == GamePhase.ROLE_ASSIGNMENT


def test_tick_advances_once_the_deadline_has_passed():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    start_game(room, personas, rng=random.Random(1))
    room.phase_deadline = time.time() - 1

    tick(room)

    assert room.phase == GamePhase.DAY_DISCUSSION


def test_tick_advances_early_when_all_alive_players_have_confirmed_votes():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    start_game(room, personas, rng=random.Random(1))
    begin_discussion(room)
    open_vote(room)
    room.phase_deadline = time.time() + 999
    target = next(iter(room.players))
    for voter_id in room.players:
        room.votes[voter_id] = target
        room.votes_confirmed.add(voter_id)

    tick(room)

    assert room.phase == GamePhase.FINAL_DEFENSE
    assert room.accused_player_id == target


def test_tick_waits_for_the_deadline_when_only_some_players_have_confirmed():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    start_game(room, personas, rng=random.Random(1))
    begin_discussion(room)
    open_vote(room)
    room.phase_deadline = time.time() + 999
    voter_ids = list(room.players)
    room.votes[voter_ids[0]] = voter_ids[1]
    room.votes_confirmed.add(voter_ids[0])

    tick(room)

    assert room.phase == GamePhase.DAY_VOTE


def test_tick_advances_night_action_early_once_every_required_role_has_acted():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=7).get_personas(list(room.players))
    rng = random.Random(7)
    start_game(room, personas, rng=rng)
    begin_discussion(room)
    open_vote(room)
    resolve_day(room, rng=rng)
    if room.phase == GamePhase.FINAL_DEFENSE:
        resolve_final_defense(room)
        resolve_execution_vote(room)
    assert room.phase == GamePhase.NIGHT_ACTION
    room.phase_deadline = time.time() + 999

    for player in room.players.values():
        if player.is_alive and player.role in ("mafia", "police", "doctor"):
            target = next(p for p in room.players.values() if p.player_id != player.player_id)
            action = {"mafia": "kill", "police": "investigate", "doctor": "protect"}[player.role]
            room.night_actions[player.player_id] = (action, target.player_id)

    tick(room)

    assert room.phase in (GamePhase.DAY_DISCUSSION, GamePhase.RESULT)
