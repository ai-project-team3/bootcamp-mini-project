"""Chance cards and the real-life forfeit (dare) pools.

Forfeit copy follows docs/content-rating-guidelines.md — suggestive, never
explicit, and never something that needs the other person's compliance.
"""

from __future__ import annotations

import random

from app.marble.models.room import BenefitCard, ChanceCardResult, ContentMode

BENEFIT_CARDS: list[BenefitCard] = list(BenefitCard)

BENEFIT_PROBABILITY = 0.8

GENERAL_FORFEITS = [
    "애교 섞인 목소리로 상대방 이름 세 번 부르기",
    "상대방이 좋아하는 캐릭터 성대모사하기",
    "10초 동안 세상에서 제일 우스꽝스러운 표정 짓고 있기",
    "즉석에서 상대방을 칭찬하는 3줄 시 짓기",
    "상대방을 웃길 때까지 아무 개그 던지기",
    "상대방 흉내를 내며 오늘 하루 있었던 일 말하기",
    "가장 좋아하는 노래 후렴구를 크게 부르기",
    "상대방의 장점 다섯 가지를 쉬지 않고 말하기",
]

ADULT_FORFEITS = [
    "상대방 귓가에 오늘 느낀 설렘 한 가지 속삭이기",
    "상대방 손등에 살짝 입맞추기",
    "상대방을 3초간 그윽하게 바라보기",
    "지금 이 순간 하고 싶은 스킨십 한 가지 말로 표현하기",
    "상대방 볼에 뽀뽀하기",
    "오늘 밤 데이트 코스를 즉흥으로 로맨틱하게 제안하기",
    "상대방에게 가장 매력적이라 느낀 순간 고백하기",
    "상대방 손을 잡고 10초간 놓지 않기",
]


def pick_forfeit(content_mode: ContentMode) -> str:
    pool = ADULT_FORFEITS if content_mode is ContentMode.ADULT else GENERAL_FORFEITS
    return random.choice(pool)


def draw_chance_card(content_mode: ContentMode) -> ChanceCardResult:
    if random.random() < BENEFIT_PROBABILITY:
        return ChanceCardResult(kind="benefit", benefit=random.choice(BENEFIT_CARDS))
    return ChanceCardResult(kind="penalty", forfeit_text=pick_forfeit(content_mode))
