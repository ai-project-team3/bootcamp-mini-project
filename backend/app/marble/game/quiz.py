"""Quiz generation.

The correct answer always comes from the target persona's own trait value, so
the external persona data stays the source of truth. Variety is produced by the
question wording and the distractor pool, not by inventing answers.

Adult-mode copy follows docs/content-rating-guidelines.md.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from app.marble.models.room import ContentMode, Persona, Quiz, TileType, TraitKey

TRAIT_KEYS: list[TraitKey] = ["stressRelief", "conflictStyle", "dateStyle", "spontaneousAction"]

TILE_TRAIT_MAP: dict[TileType, TraitKey] = {
    TileType.LOGIC: "conflictStyle",
    TileType.EMPATHY: "stressRelief",
    TileType.DRIVE: "dateStyle",
    TileType.CAUTION: "spontaneousAction",
}


@dataclass(frozen=True)
class ContentBank:
    #: trait -> question templates containing a single {n} placeholder for the nickname
    questions: dict[TraitKey, list[str]]
    #: trait -> wrong-answer pool
    distractors: dict[TraitKey, list[str]]


GENERAL_BANK = ContentBank(
    questions={
        "stressRelief": [
            "{n}님이 스트레스를 풀 때 가장 즐겨 하는 방법은?",
            "힘든 하루를 보낸 {n}님이 가장 먼저 찾을 것 같은 건?",
            "{n}님만의 기분 전환 비법은 무엇일까요?",
            "마음이 복잡할 때 {n}님이 택하는 방법은?",
            "{n}님이 재충전이 필요할 때 하는 일은?",
        ],
        "conflictStyle": [
            "{n}님이 갈등 상황에서 주로 보이는 태도는?",
            "{n}님과 다퉜을 때 예상되는 반응은?",
            "{n}님이 오해를 풀어갈 때 쓰는 방식은?",
            "서운한 일이 생겼을 때 {n}님이 택할 방법은?",
            "{n}님이 화해의 물꼬를 트는 방식은?",
        ],
        "dateStyle": [
            "{n}님이 가장 선호하는 데이트 스타일은?",
            "주말에 {n}님과 함께라면 어떤 데이트가 어울릴까요?",
            "{n}님이 상상하는 완벽한 하루 데이트는?",
            "{n}님과 처음 데이트한다면 어디가 좋을까요?",
            "{n}님이 가장 설렌다고 할 만한 데이트는?",
        ],
        "spontaneousAction": [
            "{n}님이 갑작스러운 돌발 상황에서 보이는 반응은?",
            "예상 못 한 일이 벌어졌을 때 {n}님의 첫 행동은?",
            "계획이 갑자기 틀어지면 {n}님은 어떻게 할까요?",
            "당황스러운 순간 {n}님이 취할 법한 태도는?",
            "{n}님이 위기 상황에서 가장 먼저 하는 일은?",
        ],
    },
    distractors={
        "stressRelief": [
            "매운 음식으로 스트레스 날리기",
            "혼자 방 정리하며 마음 비우기",
            "밤새 드라이브하며 머리 식히기",
            "친구들 불러 모아 왁자지껄 놀기",
            "이불 속에서 아무것도 안 하기",
            "노래방에서 목청껏 소리 지르기",
            "무작정 걸으며 생각 정리하기",
            "좋아하는 예능 몰아보기",
            "새벽까지 게임에 몰두하기",
            "달달한 디저트로 기분 풀기",
            "일기를 쓰며 마음 정리하기",
            "운동으로 땀 흠뻑 흘리기",
        ],
        "conflictStyle": [
            "일단 말을 아끼고 시간을 두기",
            "바로 사과부터 하고 보기",
            "제3자에게 중재를 부탁하기",
            "편지나 메시지로 마음 정리해 전달하기",
            "차분히 원인을 목록으로 정리하기",
            "농담으로 분위기부터 풀기",
            "상대 말을 끝까지 들어주기",
            "서로 진정할 시간을 갖자고 제안하기",
            "먼저 연락해 만나자고 하기",
            "잘못한 부분만 콕 집어 짚기",
            "좋아하는 음식으로 화해 시도하기",
            "규칙을 정해 다음을 대비하기",
        ],
        "dateStyle": [
            "집에서 함께 요리하는 데이트",
            "미술관·전시 투어 데이트",
            "액티비티 가득한 야외 데이트",
            "밤바다 드라이브 데이트",
            "취미 클래스 함께 듣는 데이트",
            "동네 산책하며 수다 떠는 데이트",
            "맛집 탐방 위주의 데이트",
            "영화관에서 조용히 보내는 데이트",
            "당일치기 기차 여행 데이트",
            "서점에서 각자 책 고르는 데이트",
            "놀이공원에서 하루 종일 노는 데이트",
            "캠핑장에서 불멍하는 데이트",
        ],
        "spontaneousAction": [
            "일단 크게 웃어넘기기",
            "재빨리 대안을 찾아 움직이기",
            "말없이 지켜보며 상황 파악하기",
            "주변 사람들에게 먼저 물어보기",
            "메모부터 남기고 침착하게 대응하기",
            "농담부터 던지고 보기",
            "일단 심호흡하고 진정하기",
            "가까운 사람에게 바로 전화하기",
            "최악의 경우부터 따져보기",
            "그냥 흐름에 몸을 맡기기",
            "손부터 바쁘게 움직이기",
            "잠깐 자리를 피해 생각 정리하기",
        ],
    },
)


ADULT_BANK = ContentBank(
    questions={
        "stressRelief": [
            "은근히 야릇한 밤, {n}님이 스트레스를 풀고 싶을 때 떠올릴 법한 방법은?",
            "혼자만의 시간이 생긴 {n}님이 은밀하게 즐길 것 같은 건?",
            "{n}님이 나른한 밤에 긴장을 푸는 방식은?",
            "분위기 있는 밤, {n}님이 스스로를 달래는 방법은?",
            "{n}님이 아무도 모르게 기분을 끌어올리는 방법은?",
        ],
        "conflictStyle": [
            "연인과 다툰 뒤, {n}님이 화해 무드를 만들려 시도할 방식은?",
            "{n}님이 삐친 연인의 마음을 녹이는 방법은?",
            "냉랭해진 분위기를 {n}님은 어떻게 되돌릴까요?",
            "{n}님이 은근슬쩍 화해를 청하는 방식은?",
            "다툰 밤, {n}님이 먼저 손 내미는 방법은?",
        ],
        "dateStyle": [
            "{n}님이 은밀하게 꿈꾸는 단둘만의 데이트 스타일은?",
            "아무도 방해하지 않는 밤, {n}님이 원할 데이트는?",
            "{n}님이 상상하는 가장 로맨틱한 밤은?",
            "{n}님과 둘만의 시간을 보낸다면 어떤 데이트일까요?",
            "{n}님이 설렘을 가장 크게 느낄 데이트는?",
        ],
        "spontaneousAction": [
            "분위기가 갑자기 달아올랐을 때 {n}님이 보일 법한 반응은?",
            "예상 못 한 스킨십에 {n}님은 어떻게 반응할까요?",
            "둘 사이 공기가 묘해졌을 때 {n}님의 첫 행동은?",
            "{n}님이 설렘을 들켰을 때 취할 법한 태도는?",
            "가까워진 거리에 {n}님이 보일 반응은?",
        ],
    },
    distractors={
        "stressRelief": [
            "따뜻한 목욕 후 은은한 조명 아래서 쉬기",
            "야한 상상하며 혼자만의 시간 보내기",
            "연인에게 달콤한 문자로 애정 표현하기",
            "속삭이듯 노래 부르며 긴장 풀기",
            "향초 켜고 로맨틱한 음악 듣기",
            "거울 앞에서 매력 어필 포즈 연습하기",
            "실크 잠옷으로 갈아입고 뒹굴기",
            "와인 한 잔 곁들이며 하루 마무리하기",
            "연인 사진 보며 혼자 미소 짓기",
            "은은한 향수 뿌리고 기분 내기",
            "달콤한 로맨스 영화에 빠져들기",
            "조명 낮추고 느린 음악에 몸 맡기기",
        ],
        "conflictStyle": [
            "달콤한 스킨십으로 슬쩍 화해 시도하기",
            "은근한 애교로 분위기 녹이기",
            "귓속말로 미안하다고 속삭이기",
            "손을 슬며시 잡으며 화해 청하기",
            "로맨틱한 이벤트로 마음 풀어주기",
            "야릇한 농담으로 분위기 전환하기",
            "뒤에서 살며시 안아버리기",
            "그윽한 눈빛으로 말없이 바라보기",
            "좋아하는 향수 뿌리고 나타나기",
            "촛불 켠 저녁 식사로 마음 전하기",
            "볼에 살짝 입맞추고 도망가기",
            "달콤한 손편지 몰래 남겨두기",
        ],
        "dateStyle": [
            "단둘이 와인 한 잔 곁들인 홈 데이트",
            "은은한 조명의 루프탑 바 데이트",
            "커플 마사지 받으러 가는 데이트",
            "새벽까지 이어지는 드라이브 데이트",
            "온천·스파에서 함께 쉬는 데이트",
            "촛불 켜고 즐기는 홈 파티 데이트",
            "야경 보이는 호텔 라운지 데이트",
            "둘만의 프라이빗 영화관 데이트",
            "재즈바에서 어깨 기대는 데이트",
            "노을 지는 바닷가 산책 데이트",
            "함께 목욕 가운 입고 쉬는 호캉스",
            "별 보러 떠나는 심야 드라이브",
        ],
        "spontaneousAction": [
            "슬쩍 다가가 손을 잡아보기",
            "장난스럽게 귓불을 만지작거리기",
            "그윽한 눈빛으로 바라보기",
            "괜히 딴청 피우며 심장 진정시키기",
            "용기 내어 살짝 안아보기",
            "농담으로 얼버무리며 웃어넘기기",
            "귓가에 조용히 속삭이기",
            "머리카락을 살며시 넘겨주기",
            "얼굴이 빨개진 채 시선 피하기",
            "손끝으로 상대 손등 스치기",
            "말없이 어깨에 기대기",
            "웃으며 한 발짝 더 다가가기",
        ],
    },
)


def _bank(content_mode: ContentMode) -> ContentBank:
    return ADULT_BANK if content_mode is ContentMode.ADULT else GENERAL_BANK


def _pick_trait(tile_type: TileType) -> TraitKey:
    mapped = TILE_TRAIT_MAP.get(tile_type)
    return mapped if mapped else random.choice(TRAIT_KEYS)


def generate_quiz(
    target: Persona,
    tile_type: TileType,
    content_mode: ContentMode,
    avoid_template_index: int | None = None,
) -> Quiz:
    """Build a 4-choice quiz about `target`'s trait for this tile.

    `avoid_template_index` keeps a room from asking the same wording twice in a
    row for the same trait.
    """
    bank = _bank(content_mode)
    trait_key = _pick_trait(tile_type)
    correct = target.traits[trait_key]

    templates = bank.questions[trait_key]
    candidates = [i for i in range(len(templates)) if i != avoid_template_index]
    template_index = random.choice(candidates)

    pool = [d for d in bank.distractors[trait_key] if d != correct]
    distractors = random.sample(pool, 3)

    choices = [correct, *distractors]
    random.shuffle(choices)

    return Quiz(
        tile_type=tile_type,
        trait_key=trait_key,
        question=templates[template_index].format(n=target.nickname),
        choices=choices,
        correct_index=choices.index(correct),
        template_index=template_index,
    )
