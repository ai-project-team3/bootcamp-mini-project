import pytest

from app.marble.game.quiz import (
    ADULT_BANK,
    GENERAL_BANK,
    TILE_TRAIT_MAP,
    TRAIT_KEYS,
    generate_quiz,
)
from app.marble.models.room import ContentMode, Persona, PersonaStats, TileType


def persona() -> Persona:
    return Persona(
        user_id="user_a",
        nickname="민수",
        stats=PersonaStats(logic=85, empathy=40, drive=75, caution=50),
        traits={
            "stressRelief": "혼자 게임하거나 운동하기",
            "conflictStyle": "논리적으로 잘잘못 따지기",
            "dateStyle": "계획대로 착착 움직이는 데이트",
            "spontaneousAction": "일단 이성적으로 원인 분석하기",
        },
    )


class TestBanks:
    @pytest.mark.parametrize("bank", [GENERAL_BANK, ADULT_BANK])
    def test_every_trait_has_five_question_templates(self, bank):
        for trait in TRAIT_KEYS:
            assert len(bank.questions[trait]) == 5, trait

    @pytest.mark.parametrize("bank", [GENERAL_BANK, ADULT_BANK])
    def test_every_trait_has_twelve_distractors(self, bank):
        for trait in TRAIT_KEYS:
            assert len(bank.distractors[trait]) == 12, trait

    @pytest.mark.parametrize("bank", [GENERAL_BANK, ADULT_BANK])
    def test_distractors_are_unique_within_a_trait(self, bank):
        for trait in TRAIT_KEYS:
            pool = bank.distractors[trait]
            assert len(set(pool)) == len(pool), trait

    def test_general_and_adult_pools_do_not_overlap(self):
        for trait in TRAIT_KEYS:
            overlap = set(GENERAL_BANK.distractors[trait]) & set(ADULT_BANK.distractors[trait])
            assert overlap == set(), (trait, overlap)


class TestGenerateQuiz:
    @pytest.mark.parametrize(
        "tile_type,trait",
        [
            (TileType.LOGIC, "conflictStyle"),
            (TileType.EMPATHY, "stressRelief"),
            (TileType.DRIVE, "dateStyle"),
            (TileType.CAUTION, "spontaneousAction"),
        ],
    )
    def test_maps_tile_to_its_trait(self, tile_type, trait):
        quiz = generate_quiz(persona(), tile_type, ContentMode.GENERAL)
        assert quiz.trait_key == trait
        assert quiz.choices[quiz.correct_index] == persona().traits[trait]

    def test_chance_tile_picks_some_trait(self):
        quiz = generate_quiz(persona(), TileType.CHANCE, ContentMode.GENERAL)
        assert quiz.trait_key in TRAIT_KEYS
        assert quiz.choices[quiz.correct_index] == persona().traits[quiz.trait_key]

    def test_always_four_unique_choices(self):
        quiz = generate_quiz(persona(), TileType.LOGIC, ContentMode.GENERAL)
        assert len(quiz.choices) == 4
        assert len(set(quiz.choices)) == 4

    def test_question_mentions_the_target_nickname(self):
        quiz = generate_quiz(persona(), TileType.DRIVE, ContentMode.GENERAL)
        assert "민수" in quiz.question

    def test_adult_mode_still_uses_the_real_trait_value_as_the_answer(self):
        quiz = generate_quiz(persona(), TileType.LOGIC, ContentMode.ADULT)
        assert quiz.choices[quiz.correct_index] == persona().traits["conflictStyle"]

    def test_avoids_repeating_the_previous_template_for_that_trait(self):
        p = persona()
        first = generate_quiz(p, TileType.LOGIC, ContentMode.GENERAL)
        for _ in range(30):
            nxt = generate_quiz(
                p, TileType.LOGIC, ContentMode.GENERAL, avoid_template_index=first.template_index
            )
            assert nxt.template_index != first.template_index

    def test_uses_several_different_templates_across_many_draws(self):
        p = persona()
        seen = {generate_quiz(p, TileType.LOGIC, ContentMode.GENERAL).template_index for _ in range(60)}
        assert len(seen) >= 3
