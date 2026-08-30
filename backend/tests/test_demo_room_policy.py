import unittest

from app import services


class DemoRoomPolicyTest(unittest.TestCase):
    def test_start_requires_between_two_and_ten_players(self):
        policy = getattr(services, 'demo_room_can_start', None)
        self.assertTrue(callable(policy), 'demo room start policy is missing')
        self.assertFalse(policy(1))
        self.assertTrue(policy(2))
        self.assertTrue(policy(10))
        self.assertFalse(policy(11))

    def test_join_rejects_the_eleventh_player(self):
        policy = getattr(services, 'demo_room_has_capacity', None)
        self.assertTrue(callable(policy), 'demo room capacity policy is missing')
        self.assertTrue(policy(9))
        self.assertFalse(policy(10))

    def test_store_keeps_demo_rooms_outside_production_models(self):
        store_type = getattr(services, 'DemoRoomStore', None)
        self.assertTrue(callable(store_type), 'isolated demo room store is missing')
        store = store_type(code_factory=lambda: 'ABC123')

        room, host = store.create_room('방장')
        guest = store.join_room(room.code, '참가자')
        started = store.start_room(room.code, host.id)

        self.assertEqual([player.nickname for player in store.list_players(room.code)], ['방장', '참가자'])
        self.assertFalse(guest.is_host)
        self.assertEqual(started.status, 'IN_PROGRESS')

    def test_store_serializes_joins_at_ten_players(self):
        store_type = getattr(services, 'DemoRoomStore', None)
        capacity_error = getattr(services, 'DemoRoomCapacityError', None)
        self.assertTrue(callable(store_type), 'isolated demo room store is missing')
        self.assertTrue(callable(capacity_error), 'demo room capacity error is missing')
        store = store_type(code_factory=lambda: 'MAX010')
        room, _ = store.create_room('방장')
        for number in range(2, 11):
            store.join_room(room.code, f'참가자{number}')

        with self.assertRaises(capacity_error):
            store.join_room(room.code, '열한번째')


if __name__ == '__main__':
    unittest.main()
