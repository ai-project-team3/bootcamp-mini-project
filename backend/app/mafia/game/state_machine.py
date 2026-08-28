import random
import time

from app.mafia.game import timing
from app.mafia.game.night_actions import resolve_night_actions
from app.mafia.models.room import GamePhase, Room
from app.mafia.game.votes import tally_votes
from app.mafia.game.win_conditions import check_win_condition
from app.mafia.models.persona import PersonaScores
from app.mafia.roles.assignment import assign_roles
from app.mafia.roles.capacity import get_role_capacity


class InvalidPhaseTransition(Exception):
    pass


def start_game(
    room: Room,
    personas: dict[str, PersonaScores],
    rng: random.Random | None = None,
) -> None:
    if room.phase != GamePhase.WAITING_ROOM:
        raise InvalidPhaseTransition(f"start_game requires WAITING_ROOM, got {room.phase}")

    capacity = get_role_capacity(room.player_count)
    assignments = assign_roles(personas, capacity, rng)
    for player_id, assignment in assignments.items():
        player = room.players[player_id]
        player.role = assignment.role
        player.assigned_score = assignment.score
        player.assigned_by = assignment.assigned_by

    room.personas = personas
    room.phase = GamePhase.ROLE_ASSIGNMENT
    room.phase_deadline = time.time() + timing.ROLE_ASSIGNMENT_SECONDS


def begin_discussion(room: Room) -> None:
    if room.phase != GamePhase.ROLE_ASSIGNMENT:
        raise InvalidPhaseTransition(f"begin_discussion requires ROLE_ASSIGNMENT, got {room.phase}")
    room.day_number = 1
    room.phase = GamePhase.DAY_DISCUSSION
    room.phase_deadline = time.time() + timing.DAY_DISCUSSION_SECONDS


def open_vote(room: Room) -> None:
    if room.phase != GamePhase.DAY_DISCUSSION:
        raise InvalidPhaseTransition(f"open_vote requires DAY_DISCUSSION, got {room.phase}")
    room.phase = GamePhase.DAY_VOTE
    room.phase_deadline = time.time() + timing.DAY_VOTE_SECONDS


def resolve_day(room: Room, rng: random.Random | None = None) -> None:
    if room.phase != GamePhase.DAY_VOTE:
        raise InvalidPhaseTransition(f"resolve_day requires DAY_VOTE, got {room.phase}")

    room.execution_result = None
    eliminated = tally_votes(room, rng)
    room.votes = {}
    room.votes_confirmed = set()

    if eliminated:
        room.accused_player_id = eliminated
        room.phase = GamePhase.FINAL_DEFENSE
        room.phase_deadline = time.time() + timing.FINAL_DEFENSE_SECONDS
    else:
        _enter_night(room)


def resolve_final_defense(room: Room) -> None:
    if room.phase != GamePhase.FINAL_DEFENSE:
        raise InvalidPhaseTransition(f"resolve_final_defense requires FINAL_DEFENSE, got {room.phase}")
    room.phase = GamePhase.EXECUTION_VOTE
    room.phase_deadline = time.time() + timing.EXECUTION_VOTE_SECONDS


def resolve_execution_vote(room: Room) -> None:
    if room.phase != GamePhase.EXECUTION_VOTE:
        raise InvalidPhaseTransition(f"resolve_execution_vote requires EXECUTION_VOTE, got {room.phase}")

    guilty = sum(1 for verdict in room.execution_votes.values() if verdict == "guilty")
    innocent = sum(1 for verdict in room.execution_votes.values() if verdict == "innocent")
    executed = guilty > innocent
    if room.accused_player_id is not None:
        room.execution_result = {
            "nickname": room.players[room.accused_player_id].nickname,
            "executed": executed,
        }
        if executed:
            room.players[room.accused_player_id].is_alive = False

    room.execution_votes = {}
    room.execution_confirmed = set()
    room.accused_player_id = None

    winner = check_win_condition(room)
    if winner:
        room.winner = winner
        room.phase = GamePhase.RESULT
        room.phase_deadline = None
    else:
        _enter_night(room)


def resolve_night(room: Room, rng: random.Random | None = None) -> None:
    if room.phase != GamePhase.NIGHT_ACTION:
        raise InvalidPhaseTransition(f"resolve_night requires NIGHT_ACTION, got {room.phase}")

    resolve_night_actions(room, rng)
    room.night_actions = {}

    winner = check_win_condition(room)
    if winner:
        room.winner = winner
        room.phase = GamePhase.RESULT
        room.phase_deadline = None
    else:
        room.day_number += 1
        room.phase = GamePhase.DAY_DISCUSSION
        room.phase_deadline = time.time() + timing.DAY_DISCUSSION_SECONDS


def restart_room(room: Room) -> None:
    if room.phase != GamePhase.RESULT:
        raise InvalidPhaseTransition(f"restart_room requires RESULT, got {room.phase}")

    for player in room.players.values():
        player.role = None
        player.assigned_score = None
        player.assigned_by = None
        player.is_alive = True

    room.personas = {}
    room.phase = GamePhase.WAITING_ROOM
    room.day_number = 0
    room.night_number = 0
    room.votes = {}
    room.votes_confirmed = set()
    room.accused_player_id = None
    room.execution_votes = {}
    room.execution_confirmed = set()
    room.night_actions = {}
    room.investigation_result = None
    room.night_summary = None
    room.execution_result = None
    room.winner = None
    room.phase_deadline = None


def _enter_night(room: Room) -> None:
    room.night_number += 1
    room.phase = GamePhase.NIGHT_ACTION
    room.phase_deadline = time.time() + timing.NIGHT_ACTION_SECONDS
    room.investigation_result = None


def _day_vote_complete(room: Room) -> bool:
    alive_ids = {p.player_id for p in room.players.values() if p.is_alive}
    return bool(alive_ids) and alive_ids <= room.votes_confirmed


def _execution_vote_complete(room: Room) -> bool:
    required = {p.player_id for p in room.players.values() if p.is_alive}
    required.discard(room.accused_player_id)
    return bool(required) and required <= room.execution_confirmed


def _night_action_complete(room: Room) -> bool:
    required = {
        p.player_id
        for p in room.players.values()
        if p.is_alive and p.role in ("mafia", "police", "doctor")
    }
    return bool(required) and required <= set(room.night_actions.keys())


_EARLY_COMPLETE_CHECKS = {
    GamePhase.DAY_VOTE: _day_vote_complete,
    GamePhase.EXECUTION_VOTE: _execution_vote_complete,
    GamePhase.NIGHT_ACTION: _night_action_complete,
}

_DEADLINE_TRANSITIONS = {
    GamePhase.ROLE_ASSIGNMENT: begin_discussion,
    GamePhase.DAY_DISCUSSION: open_vote,
    GamePhase.DAY_VOTE: resolve_day,
    GamePhase.FINAL_DEFENSE: resolve_final_defense,
    GamePhase.EXECUTION_VOTE: resolve_execution_vote,
    GamePhase.NIGHT_ACTION: resolve_night,
}


def tick(room: Room, now: float | None = None) -> None:
    """방장 없이 서버가 스스로 진행하는 사회자 역할.

    생존자 전원이 해당 단계의 행동(투표/찬반투표/밤 능력)을 완료했으면
    타이머가 남아 있어도 즉시 다음 단계로 넘어가고, 그렇지 않으면
    phase_deadline이 지났을 때만 강제로 다음 단계로 넘어간다. 한 번의
    호출은 최대 한 단계만 전이시킨다 (다음 폴링에서 다시 호출된다).
    """
    transition = _DEADLINE_TRANSITIONS.get(room.phase)
    if transition is None:
        return

    now = time.time() if now is None else now
    early_check = _EARLY_COMPLETE_CHECKS.get(room.phase)
    completed_early = early_check is not None and early_check(room)
    deadline_passed = room.phase_deadline is not None and now >= room.phase_deadline

    if completed_early or deadline_passed:
        transition(room)
