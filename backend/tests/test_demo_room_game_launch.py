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
    DemoRoomFillRequest,
    DemoRoomGameLaunchRequest,
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

    def _launch(self, host_id: str, game_id: str, options: dict | None = None):
        return demo_rooms.launch_room_game(
            'ABC123',
            DemoRoomGameLaunchRequest(
                player_id=host_id, game_id=game_id, options=options or {}
            ),
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

    def test_marble_starts_in_the_mode_the_host_picked(self):
        players = self._room_of(['방장', '둘', '셋'])

        launched = self._launch(players[0].id, 'marble', {'content_mode': 'adult'})

        room = marble_store.get(launched.launch.room_id)
        self.assertEqual(room.content_mode.value, 'adult')

    def test_marble_defaults_to_the_gentle_mode(self):
        players = self._room_of(['방장', '둘', '셋'])

        launched = self._launch(players[0].id, 'marble')

        room = marble_store.get(launched.launch.room_id)
        self.assertEqual(room.content_mode.value, 'general')

    def test_an_unknown_mode_is_refused_rather_than_played_as_general(self):
        players = self._room_of(['방장', '둘', '셋'])

        with self.assertRaises(HTTPException) as error:
            self._launch(players[0].id, 'marble', {'content_mode': 'whatever'})

        self.assertEqual(error.exception.status_code, 400)

    def test_a_game_that_ignores_options_is_unbothered_by_them(self):
        players = self._room_of(['방장', '둘', '셋', '넷'])

        launched = self._launch(players[0].id, 'mafia', {'content_mode': 'adult'})

        self.assertEqual(len(mafia_store.get(launched.launch.room_id).players), 4)

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


class DemoRoomTestPlayersTest(unittest.TestCase):
    """Filling seats so one person can walk the whole flow alone."""

    def setUp(self):
        self.store = DemoRoomStore(code_factory=lambda: 'ABC123')
        mafia_store.clear()
        marble_store.clear()

    def tearDown(self):
        mafia_store.clear()
        marble_store.clear()

    def _host(self):
        return demo_rooms.create_demo_room(
            DemoRoomNicknameRequest(nickname='방장'), self.store
        ).player

    def _fill(self, player_id: str, count: int = 1):
        return demo_rooms.fill_test_players(
            'ABC123', DemoRoomFillRequest(player_id=player_id, count=count), self.store
        )

    def test_the_host_can_fill_seats_to_reach_a_games_minimum(self):
        host = self._host()

        self._fill(host.id, 3)

        players = demo_rooms.list_demo_players('ABC123', self.store)
        self.assertEqual(len(players), 4)
        self.assertEqual([p.is_bot for p in players], [False, True, True, True])

    def test_bots_are_named_so_nobody_mistakes_them_for_people(self):
        host = self._host()

        self._fill(host.id, 2)

        names = [p.nickname for p in demo_rooms.list_demo_players('ABC123', self.store)]
        self.assertEqual(names[1:], ['테스트봇1', '테스트봇2'])

    def test_filling_stops_at_the_rooms_capacity(self):
        host = self._host()

        self._fill(host.id, 9)
        self._fill(host.id, 9)

        self.assertEqual(len(demo_rooms.list_demo_players('ABC123', self.store)), 10)

    def test_only_the_host_fills_seats(self):
        self._host()
        guest = demo_rooms.join_demo_room(
            'ABC123', DemoRoomNicknameRequest(nickname='참가자'), self.store
        )

        with self.assertRaises(HTTPException) as error:
            self._fill(guest.id)

        self.assertEqual(error.exception.status_code, 403)

    def test_seats_cannot_be_filled_once_the_game_has_started(self):
        host = self._host()
        self._fill(host.id, 1)
        demo_rooms.start_demo_room('ABC123', DemoRoomStartRequest(player_id=host.id), self.store)

        with self.assertRaises(HTTPException) as error:
            self._fill(host.id)

        self.assertEqual(error.exception.status_code, 400)

    def test_a_bot_stays_a_bot_inside_the_game_it_is_launched_into(self):
        host = self._host()
        self._fill(host.id, 3)
        demo_rooms.start_demo_room('ABC123', DemoRoomStartRequest(player_id=host.id), self.store)

        launched = demo_rooms.launch_room_game(
            'ABC123',
            DemoRoomGameLaunchRequest(player_id=host.id, game_id='mafia'),
            self.store,
        )

        room = mafia_store.get(launched.launch.room_id)
        self.assertEqual(sorted(p.is_bot for p in room.players.values()), [False, True, True, True])
        self.assertFalse(room.players[room.host_player_id].is_bot)


class DemoRoomReturnToHubTest(unittest.TestCase):
    """'게임 목록' ends the game, not the room."""

    def setUp(self):
        self.store = DemoRoomStore(code_factory=lambda: 'ABC123')
        mafia_store.clear()
        marble_store.clear()

    def tearDown(self):
        mafia_store.clear()
        marble_store.clear()

    def _started_room(self):
        host = demo_rooms.create_demo_room(
            DemoRoomNicknameRequest(nickname='방장'), self.store
        ).player
        guest = demo_rooms.join_demo_room(
            'ABC123', DemoRoomNicknameRequest(nickname='참가자'), self.store
        )
        demo_rooms.start_demo_room('ABC123', DemoRoomStartRequest(player_id=host.id), self.store)
        return host, guest

    def test_the_room_and_everyone_in_it_survive(self):
        host, guest = self._started_room()
        demo_rooms.select_demo_game(
            'ABC123', DemoRoomGameSelectRequest(player_id=host.id, game_id='liar'), self.store
        )

        room = demo_rooms.return_to_room_hub(
            'ABC123', DemoRoomStartRequest(player_id=host.id), self.store
        )

        self.assertEqual(room.status, 'IN_PROGRESS')
        self.assertEqual(room.player_count, 2)
        self.assertEqual(room.game_phase, 'HUB')
        self.assertIsNone(room.selected_game_id)

    def test_anyone_in_the_room_can_end_the_game(self):
        host, guest = self._started_room()
        demo_rooms.select_demo_game(
            'ABC123', DemoRoomGameSelectRequest(player_id=host.id, game_id='liar'), self.store
        )

        room = demo_rooms.return_to_room_hub(
            'ABC123', DemoRoomStartRequest(player_id=guest.id), self.store
        )

        self.assertEqual(room.game_phase, 'HUB')

    def test_a_launched_game_is_forgotten_so_nobody_is_pulled_back_in(self):
        host, _ = self._started_room()
        demo_rooms.launch_room_game(
            'ABC123',
            DemoRoomGameLaunchRequest(player_id=host.id, game_id='marble'),
            self.store,
        )

        room = demo_rooms.return_to_room_hub(
            'ABC123', DemoRoomStartRequest(player_id=host.id), self.store
        )

        self.assertIsNone(room.launch)

    def test_a_stranger_cannot_end_someone_elses_game(self):
        host, _ = self._started_room()
        demo_rooms.select_demo_game(
            'ABC123', DemoRoomGameSelectRequest(player_id=host.id, game_id='liar'), self.store
        )

        with self.assertRaises(HTTPException) as error:
            demo_rooms.return_to_room_hub(
                'ABC123', DemoRoomStartRequest(player_id='nobody'), self.store
            )

        self.assertEqual(error.exception.status_code, 403)
