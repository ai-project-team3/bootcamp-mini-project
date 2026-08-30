import random
from dataclasses import dataclass

from app.mafia.models.persona import PersonaScores
from app.mafia.roles.weights import compute_role_scores


@dataclass
class RoleAssignment:
    player_id: str
    role: str
    score: float
    assigned_by: str  # "preference" | "fallback_random"


def rank_top3(role_scores: dict[str, float]) -> list[tuple[str, float]]:
    return sorted(role_scores.items(), key=lambda kv: kv[1], reverse=True)[:3]


def assign_roles(
    players: dict[str, PersonaScores],
    role_capacity: dict[str, int],
    rng: random.Random | None = None,
) -> dict[str, RoleAssignment]:
    rng = rng or random.Random()

    candidates: list[tuple[float, int, str, str]] = []  # (score, rank, player_id, role)
    for player_id, persona in players.items():
        scores = compute_role_scores(persona)
        for rank, (role, score) in enumerate(rank_top3(scores), start=1):
            candidates.append((score, rank, player_id, role))
    candidates.sort(key=lambda c: (-c[0], c[1]))

    remaining = dict(role_capacity)
    assigned: dict[str, RoleAssignment] = {}

    for score, _rank, player_id, role in candidates:
        if player_id in assigned:
            continue
        if remaining.get(role, 0) <= 0:
            continue
        assigned[player_id] = RoleAssignment(player_id, role, score, "preference")
        remaining[role] -= 1

    fill_remaining_with_fallback(players, assigned, remaining, rng)
    return assigned


def fill_remaining_with_fallback(
    players: dict[str, PersonaScores],
    assigned: dict[str, RoleAssignment],
    remaining: dict[str, int],
    rng: random.Random,
) -> None:
    """정원이 남았는데 후보가 없는 경우 미배정 플레이어 중 강제 지정한다
    (spec §3.6). mafia는 공감력이 가장 낮은 사람을 우선한다."""
    unassigned = [pid for pid in players if pid not in assigned]

    for role, count in list(remaining.items()):
        while count > 0 and unassigned:
            if role == "mafia":
                pick = min(unassigned, key=lambda pid: (players[pid].EMP, rng.random()))
            else:
                pick = rng.choice(unassigned)
            role_score = compute_role_scores(players[pick])[role]
            assigned[pick] = RoleAssignment(pick, role, role_score, "fallback_random")
            unassigned.remove(pick)
            count -= 1
        remaining[role] = count
