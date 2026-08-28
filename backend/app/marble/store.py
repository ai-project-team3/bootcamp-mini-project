from app.marble.models.room import Room


class RoomStore:
    """In-memory room registry. Mirrors the mafia game's store."""

    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}

    def create(self, room: Room) -> None:
        self._rooms[room.room_id] = room

    def get(self, room_id: str) -> Room:
        if room_id not in self._rooms:
            raise KeyError(f"Room not found: {room_id}")
        return self._rooms[room_id]

    def remove(self, room_id: str) -> None:
        """Forget a room. Missing is not an error: two players leaving at once
        should both succeed rather than race each other into a 404."""
        self._rooms.pop(room_id, None)

    def clear(self) -> None:
        self._rooms.clear()

    def exists(self, room_id: str) -> bool:
        return room_id in self._rooms


# Process-wide in-memory room store, mirroring the mafia game's.
store = RoomStore()
