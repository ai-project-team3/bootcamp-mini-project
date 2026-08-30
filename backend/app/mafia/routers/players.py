from fastapi import APIRouter

from app.mafia.utils.deps import get_player_or_404, get_room_or_404

router = APIRouter(prefix="/mafia/rooms", tags=["mafia-players"])


@router.get("/{room_id}/players/{player_id}/me")
def get_my_view(room_id: str, player_id: str):
    """본인 역할과 (본인이 경찰일 때만) 최근 밤 조사 결과를 반환하는
    비공개 뷰. 다른 플레이어의 역할은 절대 이 엔드포인트로 노출되지 않는다."""
    room = get_room_or_404(room_id)
    player = get_player_or_404(room, player_id)

    investigation_result = None
    if room.investigation_result and room.investigation_result["police_id"] == player_id:
        investigation_result = room.investigation_result

    return {
        "player_id": player.player_id,
        "nickname": player.nickname,
        "is_alive": player.is_alive,
        "role": player.role,
        "assigned_score": player.assigned_score,
        "assigned_by": player.assigned_by,
        "investigation_result": investigation_result,
    }
