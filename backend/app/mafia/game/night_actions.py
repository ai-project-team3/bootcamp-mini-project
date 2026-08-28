import random

from app.mafia.models.room import Room


def resolve_night_actions(room: Room, rng: random.Random | None = None) -> str | None:
    rng = rng or random.Random()

    protect_target: str | None = None
    kill_targets: list[str] = []
    investigate: tuple[str, str] | None = None

    for actor_id, (action_type, target_id) in room.night_actions.items():
        if action_type == "protect":
            protect_target = target_id
        elif action_type == "kill":
            kill_targets.append(target_id)
        elif action_type == "investigate":
            investigate = (actor_id, target_id)

    killed: str | None = None
    if kill_targets:
        counts: dict[str, int] = {}
        for target in kill_targets:
            counts[target] = counts.get(target, 0) + 1
        max_count = max(counts.values())
        tied = [target for target, count in counts.items() if count == max_count]
        final_target = rng.choice(tied)
        if final_target != protect_target:
            killed = final_target
            room.players[killed].is_alive = False
        room.night_summary = {
            "attacked_nickname": room.players[final_target].nickname,
            "died": killed is not None,
        }
    else:
        room.night_summary = {"attacked_nickname": None, "died": False}

    room.investigation_result = None
    if investigate is not None:
        police_id, target_id = investigate
        room.investigation_result = {
            "police_id": police_id,
            "target_id": target_id,
            "is_mafia": room.players[target_id].role == "mafia",
        }

    return killed
