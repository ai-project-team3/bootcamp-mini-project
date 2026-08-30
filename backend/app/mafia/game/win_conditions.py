from app.mafia.models.room import Room


def check_win_condition(room: Room) -> str | None:
    alive = [p for p in room.players.values() if p.is_alive]
    mafia_alive = sum(1 for p in alive if p.role == "mafia")
    others_alive = len(alive) - mafia_alive

    if mafia_alive == 0:
        return "citizen"
    if mafia_alive >= others_alive:
        return "mafia"
    return None
