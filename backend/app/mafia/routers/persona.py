from fastapi import APIRouter, HTTPException

from app.mafia.models.persona import PersonaScores
from app.mafia.persona.provider import MockPersonaProvider
from app.mafia.schemas.persona import SubmitPersonaRequest
from app.mafia.utils.deps import get_room_or_404

router = APIRouter(prefix="/mafia/rooms", tags=["mafia-persona"])


@router.post("/{room_id}/persona/mock")
def submit_mock_persona(room_id: str, seed: int | None = None):
    """실제 페르소나 데이터 팀 연동 전, 대기실에서 방장이 눌러 무작위
    성향 데이터를 채우는 데모/검증용 엔드포인트. 실제 서비스에서는
    이 엔드포인트 대신 외부 팀이 POST /mafia/rooms/{room_id}/persona를
    직접 호출하며, 그 경로는 이 엔드포인트와 완전히 독립적이다."""
    room = get_room_or_404(room_id)
    provider = MockPersonaProvider(seed=seed)
    room.personas = provider.get_personas(list(room.players.keys()))
    return {"status": "ok"}


@router.post("/{room_id}/persona")
def submit_persona(room_id: str, req: SubmitPersonaRequest):
    room = get_room_or_404(room_id)
    personas: dict[str, PersonaScores] = {}
    for entry in req.players:
        if entry.player_id not in room.players:
            raise HTTPException(400, f"Unknown player_id: {entry.player_id}")
        personas[entry.player_id] = PersonaScores.from_partial(entry.persona_scores)
    room.personas = personas
    return {"status": "ok"}
