"""Persona source for the marble game.

Two sources, one seam. `MockPersonaProvider` invents a persona so the game can
be played on its own; `persona_from_icebreaking` builds one out of the
abilities the icebreaking run measured, which is what a group arriving from a
finished 얼음땡 session brings with them.

This game keeps its own four stats rather than adopting the run's five, because
they are its vocabulary out loud: the board's tiles are LOGIC / EMPATHY /
DRIVE / CAUTION and the quiz asks about them by name. The run owns the schema
it exports, so the mapping lives here, on the receiving side
(docs/페르소나-인계.md).
"""

from __future__ import annotations

import random
from typing import Protocol

from app.marble.models.room import Persona, PersonaStats


class PersonaProvider(Protocol):
    def get_persona(self, user_id: str, nickname: str) -> Persona: ...


_PRESETS = [
    (
        "분석형",
        PersonaStats(logic=85, empathy=40, drive=75, caution=50),
        {
            "stressRelief": "혼자 게임하거나 운동하기",
            "conflictStyle": "논리적으로 잘잘못 따지기",
            "dateStyle": "계획대로 착착 움직이는 데이트",
            "spontaneousAction": "일단 이성적으로 원인 분석하기",
        },
    ),
    (
        "공감형",
        PersonaStats(logic=30, empathy=90, drive=45, caution=80),
        {
            "stressRelief": "맛있는 음식 먹으며 수다 떨기",
            "conflictStyle": "감정 가라앉을 때까지 기다려주기",
            "dateStyle": "발길 닿는 대로 즉흥 데이트",
            "spontaneousAction": "당황하지만 감정 공유하기",
        },
    ),
    (
        "추진형",
        PersonaStats(logic=55, empathy=45, drive=92, caution=20),
        {
            "stressRelief": "바로 여행 계획부터 세우기",
            "conflictStyle": "즉시 만나서 담판 짓기",
            "dateStyle": "즉흥 액티비티 가득한 데이트",
            "spontaneousAction": "일단 몸부터 움직이기",
        },
    ),
    (
        "신중형",
        PersonaStats(logic=60, empathy=55, drive=25, caution=88),
        {
            "stressRelief": "혼자 조용히 산책하며 정리하기",
            "conflictStyle": "충분히 생각한 뒤 조심스레 대화 시작",
            "dateStyle": "미리 예약해둔 안정적인 코스 데이트",
            "spontaneousAction": "일단 멈추고 상황부터 파악하기",
        },
    ),
]


#: 얼음땡의 다섯 능력치를 이 게임의 네 스탯으로.
#:
#: | 여기 | 거기 | 왜 |
#: |---|---|---|
#: | logic | OBS 관찰력 | 남을 읽어 맞히는 능력 |
#: | empathy | EMP 공감력 | 같은 것 |
#: | drive | DOM 주도력 | 같은 것 |
#: | caution | 100 - SPD | 신중함은 순발력의 반대 |
#:
#: EXP 표현력은 쓰지 않는다 — 보드 칸에 대응하는 것이 없다. 마피아 쪽은
#: 반대로 이 축을 쓴다(말수가 적은 쪽이 마피아).
def stats_from_icebreaking(scores: dict[str, int]) -> PersonaStats:
    """Map the run's abilities onto this game's stats. Missing axes read 50."""
    def axis(name: str) -> int:
        return max(0, min(100, int(scores.get(name, 50))))

    return PersonaStats(
        logic=axis("OBS"),
        empathy=axis("EMP"),
        drive=axis("DOM"),
        caution=100 - axis("SPD"),
    )


def persona_from_icebreaking(user_id: str, nickname: str, scores: dict[str, int]) -> Persona:
    """A persona whose numbers are real and whose answers are still a preset.

    The board and the chemistry read the stats, so those now come from what the
    group actually did. The quiz's trait answers (스트레스 해소법 등) are not
    something five numbers can produce, so they stay a preset chosen by the
    stats — the closest one, so the answers at least match the person's shape.
    """
    stats = stats_from_icebreaking(scores)
    _, _, traits = min(
        _PRESETS,
        key=lambda preset: sum(
            abs(getattr(preset[1], key) - getattr(stats, key))
            for key in ("logic", "empathy", "drive", "caution")
        ),
    )
    return Persona(user_id=user_id, nickname=nickname, stats=stats, traits=dict(traits))


# TODO: 실제 페르소나 API 연동 시 이 클래스 대신 PersonaProvider 구현체로 교체
class MockPersonaProvider:
    """Hands out a distinct preset per player so the two never collide."""

    def __init__(self) -> None:
        self._handed_out: list[int] = []

    def get_persona(self, user_id: str, nickname: str) -> Persona:
        available = [i for i in range(len(_PRESETS)) if i not in self._handed_out]
        if not available:
            available = list(range(len(_PRESETS)))
            self._handed_out = []
        index = random.choice(available)
        self._handed_out.append(index)

        label, stats, traits = _PRESETS[index]
        return Persona(
            user_id=user_id,
            nickname=nickname,
            stats=PersonaStats(**vars(stats)),
            traits=dict(traits),
        )
