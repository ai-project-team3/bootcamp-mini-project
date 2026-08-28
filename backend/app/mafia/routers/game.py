from fastapi import APIRouter, HTTPException

from app.mafia.constants import ROLE_NIGHT_ACTION
from app.mafia.game import state_machine
from app.mafia.models.room import GamePhase
from app.mafia.schemas.game import (
    ExecutionVoteRequest,
    NightActionRequest,
    VoteRequest,
)
from app.mafia.utils.deps import get_living_player_or_400, get_room_or_404

router = APIRouter(prefix="/mafia/rooms", tags=["mafia-game"])


@router.post("/{room_id}/start")
def start_room(room_id: str):
    room = get_room_or_404(room_id)
    if len(room.players) != room.player_count:
        raise HTTPException(400, "아직 모든 인원이 참가하지 않았습니다")
    if len(room.personas) != room.player_count:
        raise HTTPException(400, "Persona data missing for some players")
    try:
        state_machine.start_game(room, room.personas)
    except state_machine.InvalidPhaseTransition as exc:
        raise HTTPException(400, str(exc))
    return {"phase": room.phase.value}


@router.post("/{room_id}/advance")
def advance(room_id: str):
    """방장 수동 진행용이 아니라 테스트/내부 재사용을 위해 남겨둔 엔드포인트.
    실제 프론트엔드는 GET /state 호출마다 실행되는 tick()에 의존하며 이
    엔드포인트를 호출하지 않는다."""
    room = get_room_or_404(room_id)
    transitions = {
        GamePhase.ROLE_ASSIGNMENT: state_machine.begin_discussion,
        GamePhase.DAY_DISCUSSION: state_machine.open_vote,
        GamePhase.DAY_VOTE: state_machine.resolve_day,
        GamePhase.FINAL_DEFENSE: state_machine.resolve_final_defense,
        GamePhase.EXECUTION_VOTE: state_machine.resolve_execution_vote,
        GamePhase.NIGHT_ACTION: state_machine.resolve_night,
    }
    transition = transitions.get(room.phase)
    if transition is None:
        raise HTTPException(400, f"Cannot advance from phase {room.phase.value}")
    transition(room)
    return {"phase": room.phase.value}


@router.post("/{room_id}/restart")
def restart_room_endpoint(room_id: str):
    room = get_room_or_404(room_id)
    try:
        state_machine.restart_room(room)
    except state_machine.InvalidPhaseTransition as exc:
        raise HTTPException(400, str(exc))
    return {"phase": room.phase.value}


@router.post("/{room_id}/vote")
def submit_vote(room_id: str, req: VoteRequest):
    room = get_room_or_404(room_id)
    if room.phase != GamePhase.DAY_VOTE:
        raise HTTPException(400, "Voting is only allowed during DAY_VOTE phase")
    # 방에 없는 id나 이미 탈락한 사람이 투표에 섞이면, 개표 때 존재하지 않는
    # 플레이어를 처형하려다 서버가 죽는다. 여기서 막는다.
    get_living_player_or_400(room, req.voter_id, "투표할")
    get_living_player_or_400(room, req.target_id, "지목될")
    if req.voter_id in room.votes_confirmed:
        raise HTTPException(400, "이미 투표를 완료했습니다")
    room.votes[req.voter_id] = req.target_id
    room.votes_confirmed.add(req.voter_id)
    return {"status": "ok"}


@router.post("/{room_id}/execution-vote")
def submit_execution_vote(room_id: str, req: ExecutionVoteRequest):
    room = get_room_or_404(room_id)
    if room.phase != GamePhase.EXECUTION_VOTE:
        raise HTTPException(400, "찬반투표는 EXECUTION_VOTE 단계에서만 가능합니다")
    get_living_player_or_400(room, req.voter_id, "투표할")
    if req.voter_id == room.accused_player_id:
        raise HTTPException(400, "지목된 사람은 투표할 수 없습니다")
    if req.voter_id in room.execution_confirmed:
        raise HTTPException(400, "이미 투표를 완료했습니다")
    room.execution_votes[req.voter_id] = req.verdict
    room.execution_confirmed.add(req.voter_id)
    return {"status": "ok"}


@router.post("/{room_id}/night-action")
def submit_night_action(room_id: str, req: NightActionRequest):
    room = get_room_or_404(room_id)
    if room.phase != GamePhase.NIGHT_ACTION:
        raise HTTPException(400, "Night actions are only allowed during NIGHT_ACTION phase")

    actor = get_living_player_or_400(room, req.actor_id, "능력을 사용할")
    # 역할마다 쓸 수 있는 행동이 정확히 하나다. 이 검사가 없으면 시민이
    # "kill"을 보내 사람을 죽이거나, 아무나 "investigate"로 남의 정체를
    # 알아낼 수 있다.
    allowed = ROLE_NIGHT_ACTION.get(actor.role or "")
    if allowed is None:
        raise HTTPException(403, "밤에 사용할 수 있는 능력이 없습니다")
    if req.action_type != allowed:
        raise HTTPException(403, f"'{actor.role}' 역할은 '{req.action_type}' 행동을 할 수 없습니다")

    get_living_player_or_400(room, req.target_id, "대상이 될")
    if req.action_type != "protect" and req.target_id == req.actor_id:
        raise HTTPException(400, "자기 자신을 대상으로 지정할 수 없습니다")

    room.night_actions[req.actor_id] = (req.action_type, req.target_id)
    if req.action_type == "investigate":
        # 경찰의 조사는 다른 밤 행동(습격/보호)과 달리 서로 영향을 주지 않으므로,
        # 밤이 끝날 때까지 기다리지 않고 즉시 결과를 계산해 그날 밤 안에 보여준다.
        room.investigation_result = {
            "police_id": req.actor_id,
            "target_id": req.target_id,
            "is_mafia": room.players[req.target_id].role == "mafia",
        }
        return {"status": "ok", "investigation_result": room.investigation_result}
    return {"status": "ok"}
