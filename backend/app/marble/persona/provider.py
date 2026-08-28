"""Persona source for the marble game.

The real persona data is owned by another team. This module keeps the seam:
game code depends only on `PersonaProvider`, so swapping in the real source is
a one-line change at the call site.
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
