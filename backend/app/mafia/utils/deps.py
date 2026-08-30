"""Shared lookup helpers. Every router validates its inputs through these so a
malformed request becomes a 4xx instead of a KeyError crash deeper in the
game logic."""

from fastapi import HTTPException

from app.mafia.models.room import Player, Room
from app.mafia.store import store


def get_room_or_404(room_id: str) -> Room:
    try:
        return store.get(room_id)
    except KeyError:
        raise HTTPException(404, "Room not found")


def get_player_or_404(room: Room, player_id: str) -> Player:
    """Reject a player id that is not in this room."""
    if player_id not in room.players:
        raise HTTPException(404, f"Player not in this room: {player_id}")
    return room.players[player_id]


def get_living_player_or_400(room: Room, player_id: str, what: str) -> Player:
    """Reject an id that is unknown *or* already eliminated."""
    player = get_player_or_404(room, player_id)
    if not player.is_alive:
        raise HTTPException(400, f"탈락한 플레이어는 {what} 수 없습니다")
    return player
