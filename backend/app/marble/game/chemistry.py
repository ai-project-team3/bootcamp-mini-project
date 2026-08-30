"""Closing blurb about how the table fits together.

Works for any room size: with two players it reads as a couple's chemistry, and
with more it reads as the group's.
"""

from __future__ import annotations

from itertools import combinations

from app.marble.models.room import Player

STAT_KEYS = ["logic", "empathy", "drive", "caution"]


def _average_pairwise_distance(players: list[Player]) -> float | None:
    """Mean total stat gap across every pair. None when nobody has a persona."""
    withstats = [p for p in players if p.persona]
    if len(withstats) < 2:
        return None
    gaps = [
        sum(
            abs(getattr(a.persona.stats, key) - getattr(b.persona.stats, key))
            for key in STAT_KEYS
        )
        for a, b in combinations(withstats, 2)
        if a.persona and b.persona
    ]
    return sum(gaps) / len(gaps) if gaps else None


def summarize_chemistry(players: list[Player], winner_id: str | None) -> str:
    parts: list[str] = []
    is_pair = len(players) == 2

    if winner_id is not None:
        winner = next((p for p in players if p.player_id == winner_id), None)
        if winner is not None:
            if is_pair:
                other = next(p for p in players if p.player_id != winner_id)
                parts.append(
                    f"{winner.nickname}님이 한 바퀴를 먼저 완주했어요, "
                    f"{other.nickname}님의 성향을 그만큼 잘 읽고 있다는 뜻이에요."
                )
            else:
                parts.append(
                    f"{winner.nickname}님이 한 바퀴를 먼저 완주했어요, "
                    "이 자리에서 사람 보는 눈이 제일 밝았다는 뜻이에요."
                )

    distance = _average_pairwise_distance(players)
    if distance is not None:
        who = "두 분" if is_pair else "여러분"
        if distance <= 60:
            parts.append(f"{who}의 성향 수치도 전반적으로 비슷한 편이라, 대화가 잘 통하는 케미로 보여요.")
        elif distance <= 120:
            parts.append(f"{who}은 서로 다른 면을 가진 만큼, 함께 있을 때 서로를 보완해줄 수 있는 케미예요.")
        else:
            parts.append(f"{who}은 성향이 꽤 대조적이라, 서로에게 새로운 자극이 되어주는 케미예요.")

    scores = [p.score for p in players]
    if scores and max(scores) - min(scores) <= 10:
        parts.append("점수도 팽팽했던 걸 보면, 서로를 아는 정도는 막상막하네요.")

    return " ".join(parts)
