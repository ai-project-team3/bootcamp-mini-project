from unittest.mock import patch

import pytest

from app.marble.game.cards import (
    ADULT_FORFEITS,
    BENEFIT_CARDS,
    GENERAL_FORFEITS,
    draw_chance_card,
    pick_forfeit,
)
from app.marble.models.room import BenefitCard, ContentMode


class TestForfeits:
    def test_general_mode_draws_from_the_general_pool(self):
        assert pick_forfeit(ContentMode.GENERAL) in GENERAL_FORFEITS

    def test_adult_mode_draws_from_the_adult_pool(self):
        assert pick_forfeit(ContentMode.ADULT) in ADULT_FORFEITS

    def test_pools_are_disjoint(self):
        assert set(GENERAL_FORFEITS) & set(ADULT_FORFEITS) == set()

    @pytest.mark.parametrize("pool", [GENERAL_FORFEITS, ADULT_FORFEITS])
    def test_pools_have_no_duplicates(self, pool):
        assert len(set(pool)) == len(pool)


class TestChanceCard:
    def test_draws_a_benefit_in_the_eighty_percent_bucket(self):
        with patch("app.marble.game.cards.random.random", return_value=0.1):
            card = draw_chance_card(ContentMode.GENERAL)
        assert card.kind == "benefit"
        assert card.benefit in BENEFIT_CARDS
        assert card.forfeit_text is None

    def test_draws_a_penalty_in_the_twenty_percent_bucket(self):
        with patch("app.marble.game.cards.random.random", return_value=0.95):
            card = draw_chance_card(ContentMode.GENERAL)
        assert card.kind == "penalty"
        assert card.benefit is None
        assert card.forfeit_text in GENERAL_FORFEITS

    def test_penalty_uses_the_adult_pool_in_adult_mode(self):
        with patch("app.marble.game.cards.random.random", return_value=0.95):
            card = draw_chance_card(ContentMode.ADULT)
        assert card.forfeit_text in ADULT_FORFEITS

    def test_every_benefit_type_is_reachable(self):
        seen = set()
        with patch("app.marble.game.cards.random.random", return_value=0.1):
            for benefit in BENEFIT_CARDS:
                with patch("app.marble.game.cards.random.choice", return_value=benefit):
                    seen.add(draw_chance_card(ContentMode.GENERAL).benefit)
        assert seen == set(BENEFIT_CARDS)

    def test_benefit_cards_cover_all_five_kinds(self):
        assert set(BENEFIT_CARDS) == set(BenefitCard)
