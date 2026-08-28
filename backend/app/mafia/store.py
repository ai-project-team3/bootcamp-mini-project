from app.mafia.models.room import Room


class RoomStore:
    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}

    def create(self, room: Room) -> None:
        self._rooms[room.room_id] = room

    def get(self, room_id: str) -> Room:
        if room_id not in self._rooms:
            raise KeyError(f"Room not found: {room_id}")
        return self._rooms[room_id]

    def exists(self, room_id: str) -> bool:
        return room_id in self._rooms

    def clear(self) -> None:
        self._rooms.clear()


# Process-wide in-memory room store. Rooms live only as long as the server
# process does; swap this module for a real persistence layer once rooms must
# survive a restart.
store = RoomStore()
