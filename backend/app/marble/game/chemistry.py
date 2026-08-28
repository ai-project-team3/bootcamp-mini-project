"""Closing blurb about how the two personas fit together."""

from __future__ import annotations

from app.marble.models.room import Player

STAT_KEYS = ["logic", "empathy", "drive", "caution"]


def summarize_chemistry(player_a: Player, player_b: Player, winner_id: str | None) -> str:
    parts: list[str] = []

    if winner_id is not None:
        winner = player_a if player_a.player_id == winner_id else player_b
        loser = player_b if winner is player_a else player_a
        parts.append(
            f"{winner.nickname}님이 한 바퀴를 먼저 완주했어요, "
            f"{loser.nickname}님의 성향을 그만큼 잘 읽고 있다는 뜻이에요."
        )

    if player_a.persona and player_b.persona:
        stat_diff = sum(
            abs(getattr(player_a.persona.stats, key) - getattr(player_b.persona.stats, key))
            for key in STAT_KEYS
        )
        if stat_diff <= 60:
            parts.append("두 분의 성향 수치도 전반적으로 비슷한 편이라, 대화가 잘 통하는 케미로 보여요.")
        elif stat_diff <= 120:
            parts.append("두 분은 서로 다른 면을 가진 만큼, 함께 있을 때 서로를 보완해줄 수 있는 케미예요.")
        else:
            parts.append("두 분은 성향이 꽤 대조적이라, 서로에게 새로운 자극이 되어주는 케미예요.")

    score_diff = abs(player_a.score - player_b.score)
    if score_diff <= 10:
        parts.append("점수도 팽팽했던 걸 보면, 서로를 아는 정도는 막상막하네요.")

    return " ".join(parts)
