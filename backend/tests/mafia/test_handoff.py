"""Seating a gathered group in a mafia room.

Roles are dealt from what the icebreaking run measured, but the game list is
also reachable without ever playing it — someone opens 게임 더 하기, fills the
seats with test bots and picks 마피아. These tests hold the line that such a
group can still start: a seat with nothing measured is filled in neutral, so
the room never arrives with abilities for only some of its players.
"""

import unittest

from app.mafia import handoff
from app.mafia.store import store


class MafiaHandoffPersonaTest(unittest.TestCase):
    def setUp(self):
        store.clear()

    def tearDown(self):
        store.clear()

    def _seat(self, personas):
        nicknames = [f'P{i}' for i in range(len(personas))]
        room_id, player_ids = handoff.create_room_for(
            nicknames, 0, None, [False] * len(personas), personas
        )
        return store.get(room_id), player_ids

    def test_a_group_that_never_played_the_icebreaking_run_can_still_start(self):
        # A room opened straight from the game list. Nobody has abilities,
        # and refusing to start there would make 마피아 playable only by
        # people who had already finished the icebreaking run.
        room, player_ids = self._seat([None] * 6)

        self.assertEqual(len(room.personas), room.player_count)
        for player_id in player_ids:
            self.assertIn(player_id, room.personas)

    def test_a_group_where_only_some_played_fills_the_rest_in_neutral(self):
        room, player_ids = self._seat([{'DOM': 80}] + [None] * 5)

        self.assertEqual(len(room.personas), room.player_count)
        self.assertEqual(room.personas[player_ids[0]].DOM, 80)

    def test_measured_abilities_are_kept_as_they_arrived(self):
        room, player_ids = self._seat([{'DOM': 70, 'EMP': 30}] * 4)

        self.assertEqual(len(room.personas), 4)
        self.assertEqual(room.personas[player_ids[2]].DOM, 70)
        self.assertEqual(room.personas[player_ids[2]].EMP, 30)
