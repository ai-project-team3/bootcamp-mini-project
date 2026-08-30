"""Shared lookup helpers so a malformed request becomes a 4xx instead of a
KeyError crash deeper in the engine."""

from fastapi import HTTPException

from app.marble.models.room import Player, Room
from app.marble.store import store


def get_room_or_404(room_id: str) -> Room:
    try:
        return store.get(room_id)
    except KeyError:
        raise HTTPException(404, "Room not found")


def get_player_or_404(room: Room, player_id: str) -> Player:
    if player_id not in room.players:
        raise HTTPException(404, "Player not in this room")
    return room.players[player_id]
