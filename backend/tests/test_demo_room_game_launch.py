"""Handing the gathered group over to a game that runs its own rooms.

The point of the shared room is that people are invited once. These tests hold
the line that picking 마피아 or 커플 브루마블 seats everyone who is already
here, and that each player learns only their own id in the new room.
"""

import unittest

from fastapi import HTTPException

from app.mafia.store import store as mafia_store
from app.marble.store import store as marble_store
from app.routers import demo_rooms
from app.schemas.demo_room import (
    DemoRoomGameSelectRequest,
    DemoRoomNicknameRequest,
    DemoRoomStartRequest,
)
from app.services import DemoRoomStore


class DemoRoomGameLaunchTest(unittest.TestCase):
    def setUp(self):
        self.store = DemoRoomStore(code_factory=lambda: 'ABC123')
        mafia_store.clear()
        marble_store.clear()

    def tearDown(self):
        mafia_store.clear()
        marble_store.clear()

    def _room_of(self, nicknames: list[str]):
        created = demo_rooms.create_demo_room(
            DemoRoomNicknameRequest(nickname=nicknames[0]), self.store
        )
        players = [created.player]
        for nickname in nicknames[1:]:
            players.append(
                demo_rooms.join_demo_room(
                    'ABC123', DemoRoomNicknameRequest(nickname=nickname), self.store
                )
            )
        demo_rooms.start_demo_room(
            'ABC123', DemoRoomStartRequest(player_id=created.player.id), self.store
        )
        return players

    def _launch(self, host_id: str, game_id: str):
        return demo_rooms.launch_room_game(
            'ABC123',
            DemoRoomGameSelectRequest(player_id=host_id, game_id=game_id),
            self.store,
        )

    def test_launching_mafia_seats_everyone_already_in_the_room(self):
        players = self._room_of(['방장', '둘', '셋', '넷'])

        launched = self._launch(players[0].id, 'mafia')

        self.assertEqual(launched.game_phase, 'LAUNCHED')
        self.assertEqual(launched.launch.game_id, 'mafia')
        room = mafia_store.get(launched.launch.room_id)
        self.assertEqual(len(room.players), 4)
        self.assertEqual(
            sorted(player.nickname for player in room.players.values()),
            sorted(['방장', '둘', '셋', '넷']),
        )

    def test_the_shared_rooms_host_hosts_the_game_room(self):
        players = self._room_of(['방장', '둘', '셋', '넷'])

        launched = self._launch(players[0].id, 'mafia')

        room = mafia_store.get(launched.launch.room_id)
        host = room.players[room.host_player_id]
        self.assertEqual(host.nickname, '방장')

    def test_each_player_claims_only_their_own_seat(self):
        players = self._room_of(['방장', '둘', '셋', '넷'])
        launched = self._launch(players[0].id, 'mafia')

        claims = [
            demo_rooms.claim_launched_game(
                'ABC123', DemoRoomStartRequest(player_id=player.id), self.store
            )
            for player in players
        ]

        room = mafia_store.get(launched.launch.room_id)
        for player, claim in zip(players, claims):
            self.assertEqual(room.players[claim.player_id].nickname, player.nickname)
        self.assertEqual(len({claim.player_id for claim in claims}), 4)
        self.assertEqual([claim.is_host for claim in claims], [True, False, False, False])

    def test_the_room_poll_never_carries_anyone_elses_game_id(self):
        players = self._room_of(['방장', '둘', '셋', '넷'])
        self._launch(players[0].id, 'mafia')

        polled = demo_rooms.get_demo_room('ABC123', self.store)

        self.assertEqual(set(polled.launch.model_dump()), {'game_id', 'room_id'})

    def test_marble_keeps_the_order_people_joined_in(self):
        players = self._room_of(['방장', '둘', '셋'])

        launched = self._launch(players[0].id, 'marble')

        room = marble_store.get(launched.launch.room_id)
        self.assertEqual(
            [room.players[pid].nickname for pid in room.turn_order],
            ['방장', '둘', '셋'],
        )

    def test_a_group_mafia_has_no_role_table_for_is_refused(self):
        players = self._room_of(['방장', '둘', '셋'])

        with self.assertRaises(HTTPException) as error:
            self._launch(players[0].id, 'mafia')

        self.assertEqual(error.exception.status_code, 400)
        self.assertIn('4', error.exception.detail)

    def test_only_the_host_can_launch(self):
        players = self._room_of(['방장', '둘', '셋', '넷'])

        with self.assertRaises(HTTPException) as error:
            self._launch(players[1].id, 'mafia')

        self.assertEqual(error.exception.status_code, 403)

    def test_a_game_that_plays_inside_the_shared_room_is_not_launchable(self):
        players = self._room_of(['방장', '둘', '셋', '넷'])

        with self.assertRaises(HTTPException) as error:
            self._launch(players[0].id, 'liar')

        self.assertEqual(error.exception.status_code, 400)

    def test_claiming_before_a_launch_fails(self):
        players = self._room_of(['방장', '둘', '셋', '넷'])

        with self.assertRaises(HTTPException) as error:
            demo_rooms.claim_launched_game(
                'ABC123', DemoRoomStartRequest(player_id=players[0].id), self.store
            )

        self.assertEqual(error.exception.status_code, 400)

    def test_an_id_that_is_not_in_the_room_cannot_claim_a_seat(self):
        players = self._room_of(['방장', '둘', '셋', '넷'])
        self._launch(players[0].id, 'mafia')

        with self.assertRaises(HTTPException) as error:
            demo_rooms.claim_launched_game(
                'ABC123', DemoRoomStartRequest(player_id='not-a-player'), self.store
            )

        self.assertEqual(error.exception.status_code, 403)

    def test_launching_again_replaces_the_previous_game_room(self):
        players = self._room_of(['방장', '둘', '셋', '넷'])
        first = self._launch(players[0].id, 'mafia')

        second = self._launch(players[0].id, 'marble')

        self.assertNotEqual(first.launch.room_id, second.launch.room_id)
        self.assertEqual(second.launch.game_id, 'marble')
        claim = demo_rooms.claim_launched_game(
            'ABC123', DemoRoomStartRequest(player_id=players[0].id), self.store
        )
        self.assertEqual(claim.room_id, second.launch.room_id)


if __name__ == '__main__':
    unittest.main()
