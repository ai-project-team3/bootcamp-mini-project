import unittest

from fastapi import HTTPException

from app.routers import demo_rooms
from app.schemas.demo_room import DemoRoomCreateRequest, DemoRoomNicknameRequest, DemoRoomStartRequest
from app.services import DemoRoomStore


class DemoRoomsApiTest(unittest.TestCase):
    def setUp(self):
        self.store = DemoRoomStore(code_factory=lambda: 'ABC123')

    def test_two_players_can_start_and_room_status_is_shared(self):
        created = demo_rooms.create_demo_room(
            DemoRoomCreateRequest(nickname='방장'), self.store)
        demo_rooms.join_demo_room('ABC123', DemoRoomNicknameRequest(nickname='참가자'), self.store)
        started = demo_rooms.start_demo_room(
            'ABC123',
            DemoRoomStartRequest(player_id=created.player.id),
            self.store,
        )

        self.assertEqual(started.status, 'IN_PROGRESS')
        self.assertEqual(demo_rooms.get_demo_room('ABC123', self.store).status, 'IN_PROGRESS')

    def test_host_cannot_start_alone(self):
        created = demo_rooms.create_demo_room(
            DemoRoomCreateRequest(nickname='혼자'), self.store)

        with self.assertRaises(HTTPException) as error:
            demo_rooms.start_demo_room(
                'ABC123',
                DemoRoomStartRequest(player_id=created.player.id),
                self.store,
            )

        self.assertEqual(error.exception.status_code, 400)

    def test_room_rejects_the_eleventh_player(self):
        demo_rooms.create_demo_room(
            DemoRoomCreateRequest(nickname='방장'), self.store)
        for number in range(2, 11):
            demo_rooms.join_demo_room(
                'ABC123',
                DemoRoomNicknameRequest(nickname=f'참가자{number}'),
                self.store,
            )

        with self.assertRaises(HTTPException) as error:
            demo_rooms.join_demo_room(
                'ABC123',
                DemoRoomNicknameRequest(nickname='열한번째'),
                self.store,
            )

        self.assertEqual(error.exception.status_code, 400)

    def test_host_game_selection_is_shared_as_a_guide_for_every_participant(self):
        created = demo_rooms.create_demo_room(
            DemoRoomCreateRequest(nickname='host'), self.store)
        demo_rooms.join_demo_room('ABC123', DemoRoomNicknameRequest(nickname='guest'), self.store)
        demo_rooms.start_demo_room('ABC123', DemoRoomStartRequest(player_id=created.player.id), self.store)

        selected = self.store.select_game('ABC123', created.player.id, 'persona-impostor')

        self.assertEqual(selected.selected_game_id, 'persona-impostor')
        self.assertEqual(selected.game_phase, 'GUIDE')
        self.assertEqual(self.store.get_room('ABC123').game_phase, 'GUIDE')

    def test_only_host_can_start_selected_game_for_everyone(self):
        created = demo_rooms.create_demo_room(
            DemoRoomCreateRequest(nickname='host'), self.store)
        guest = demo_rooms.join_demo_room('ABC123', DemoRoomNicknameRequest(nickname='guest'), self.store)
        demo_rooms.start_demo_room('ABC123', DemoRoomStartRequest(player_id=created.player.id), self.store)
        self.store.select_game('ABC123', created.player.id, 'liar')

        with self.assertRaises(Exception):
            self.store.start_selected_game('ABC123', guest.id)

        started = self.store.start_selected_game('ABC123', created.player.id)
        self.assertEqual(started.selected_game_id, 'liar')
        self.assertEqual(started.game_phase, 'PLAYING')

    def test_guest_can_leave_an_in_progress_room_without_ending_it(self):
        created = demo_rooms.create_demo_room(
            DemoRoomCreateRequest(nickname='host'), self.store)
        guest = demo_rooms.join_demo_room('ABC123', DemoRoomNicknameRequest(nickname='guest'), self.store)
        demo_rooms.start_demo_room('ABC123', DemoRoomStartRequest(player_id=created.player.id), self.store)

        ended = self.store.leave_room('ABC123', guest.id)

        self.assertFalse(ended)
        self.assertEqual([player.id for player in self.store.list_players('ABC123')], [created.player.id])
        self.assertEqual(self.store.get_room('ABC123').status, 'IN_PROGRESS')

    def test_host_exit_ends_the_room_for_everyone(self):
        created = demo_rooms.create_demo_room(
            DemoRoomCreateRequest(nickname='host'), self.store)
        self.store.join_room('ABC123', 'guest')
        demo_rooms.start_demo_room('ABC123', DemoRoomStartRequest(player_id=created.player.id), self.store)

        ended = self.store.leave_room('ABC123', created.player.id)

        self.assertTrue(ended)
        with self.assertRaises(Exception):
            self.store.get_room('ABC123')


if __name__ == '__main__':
    unittest.main()
