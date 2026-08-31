"""Carrying what 얼음땡 measured into the games that come after it.

The group re-gathers in a new room with new ids, so the only thing linking a
player to the abilities they earned is the name they go by. These tests hold
the two halves of that: matching people by name, and each game mapping the five
abilities onto its own rules (docs/페르소나-인계.md).
"""

import unittest

from app.mafia.models.persona import NEUTRAL_SCORE, PERSONA_AXES
from app.mafia.store import store as mafia_store
from app.marble.persona.provider import stats_from_icebreaking
from app.marble.store import store as marble_store
from app.services.game_launch import LaunchablePlayer, launch
from app.services.persona_handoff import normalize_nickname


SCORES = {"DOM": 90, "SPD": 10, "EXP": 20, "EMP": 30, "OBS": 80}


class MatchingPeopleByNameTest(unittest.TestCase):
    def test_spacing_and_case_do_not_make_a_different_person(self):
        self.assertEqual(normalize_nickname(" 김 하늘 "), normalize_nickname("김하늘"))
        self.assertEqual(normalize_nickname("Minwoo"), normalize_nickname("minwoo"))

    def test_different_names_stay_different(self):
        self.assertNotEqual(normalize_nickname("하늘"), normalize_nickname("바다"))


class MafiaReceivesTheAbilitiesTest(unittest.TestCase):
    def setUp(self):
        mafia_store.clear()

    def tearDown(self):
        mafia_store.clear()

    def _launch(self, personas):
        players = [
            LaunchablePlayer(id=f"d{i}", nickname=f"p{i}", is_host=i == 0, persona=persona)
            for i, persona in enumerate(personas)
        ]
        return mafia_store.get(launch("mafia", players).room_id)

    def test_the_abilities_arrive_unchanged(self):
        room = self._launch([SCORES] * 4)

        seated = next(iter(room.personas.values()))
        self.assertEqual(seated.model_dump(), SCORES)

    def test_roles_can_be_dealt_without_asking_anyone_for_anything(self):
        """A group off the back of 얼음땡 skips the '성향 데이터 채우기' step."""
        room = self._launch([SCORES] * 4)

        self.assertEqual(len(room.personas), room.player_count)

    def test_someone_the_run_never_saw_plays_as_average(self):
        room = self._launch([SCORES, SCORES, None, None])

        self.assertEqual(len(room.personas), 4)
        unknown = [p for p in room.personas.values() if p.model_dump() != SCORES]
        self.assertEqual(len(unknown), 2)
        for persona in unknown:
            self.assertEqual({getattr(persona, axis) for axis in PERSONA_AXES}, {NEUTRAL_SCORE})

    def test_a_group_that_skipped_the_run_still_gets_a_playable_room(self):
        # Everyone plays as average. Leaving the room with no abilities at all
        # looked harmless, but roles are only dealt once every seat has them,
        # so POST /start refused and 마피아 could not be reached from the game
        # list — only from a finished icebreaking session.
        room = self._launch([None] * 4)

        self.assertEqual(len(room.personas), room.player_count)
        for persona in room.personas.values():
            self.assertEqual({getattr(persona, axis) for axis in PERSONA_AXES}, {NEUTRAL_SCORE})


class MarbleMapsThemOntoItsOwnStatsTest(unittest.TestCase):
    def setUp(self):
        marble_store.clear()

    def tearDown(self):
        marble_store.clear()

    def test_each_stat_reads_the_ability_it_corresponds_to(self):
        stats = stats_from_icebreaking(SCORES)

        self.assertEqual(stats.logic, 80)    # OBS 관찰력
        self.assertEqual(stats.empathy, 30)  # EMP 공감력
        self.assertEqual(stats.drive, 90)    # DOM 주도력

    def test_caution_is_the_opposite_of_being_quick(self):
        self.assertEqual(stats_from_icebreaking({"SPD": 10}).caution, 90)
        self.assertEqual(stats_from_icebreaking({"SPD": 90}).caution, 10)

    def test_missing_abilities_read_as_average(self):
        stats = stats_from_icebreaking({})

        self.assertEqual(
            (stats.logic, stats.empathy, stats.drive, stats.caution), (50, 50, 50, 50)
        )

    def test_the_board_is_built_from_what_the_group_actually_did(self):
        players = [
            LaunchablePlayer(id=f"d{i}", nickname=f"p{i}", is_host=i == 0, persona=SCORES)
            for i in range(3)
        ]

        room = marble_store.get(launch("marble", players).room_id)

        for player in room.players.values():
            self.assertEqual(player.persona.stats.drive, 90)
            self.assertEqual(player.persona.stats.caution, 90)

    def test_the_quiz_still_has_answers_to_ask_about(self):
        """Five numbers cannot produce '스트레스 해소법'; a preset supplies those."""
        players = [
            LaunchablePlayer(id="d0", nickname="p0", is_host=True, persona=SCORES),
            LaunchablePlayer(id="d1", nickname="p1", is_host=False, persona=None),
        ]

        room = marble_store.get(launch("marble", players).room_id)

        for player in room.players.values():
            self.assertTrue(player.persona.traits)


if __name__ == "__main__":
    unittest.main()
