import socket
import unittest
from unittest.mock import patch

from app.routers import health


class HealthTest(unittest.TestCase):
    def test_health_is_ok(self):
        self.assertEqual(health.check_health().status, 'ok')


class LanAddressTest(unittest.TestCase):
    """QR에 담을 주소를 정하려고 프론트가 묻는 값이다.

    방을 만든 사람이 localhost로 열었으면 주소창 주소는 QR에 쓸 수 없다 — 그걸
    찍은 폰에서 localhost는 폰 자신이다. 만든 쪽 화면은 멀쩡하고 찍는 쪽만
    실패하는 종류라, 여기서 틀리면 아무도 원인을 못 찾는다.
    """

    def test_reports_the_address_phones_can_reach(self):
        with patch.object(health, '_pick_lan_address', return_value='192.168.0.27'):
            self.assertEqual(health.lan_address().host, '192.168.0.27')

    def test_says_nothing_rather_than_guessing(self):
        """랜에 안 붙어 있을 때. 화면은 None을 보고 경고를 띄운다. 아무 주소나
        지어내면 조용히 안 되는 QR이 나간다."""
        with patch.object(health, '_pick_lan_address', return_value=None):
            self.assertIsNone(health.lan_address().host)

    def test_loopback_is_not_offered_as_a_lan_address(self):
        """127.x를 QR에 담아봐야 찍는 폰 자신을 가리킨다. 없는 것과 같다."""
        self.assertIsNone(self._address_when(lambda: ('127.0.0.1', 0)))

    def test_a_real_address_is_offered(self):
        self.assertEqual(self._address_when(lambda: ('192.168.0.27', 0)), '192.168.0.27')

    def test_no_route_means_no_address(self):
        """랜선도 Wi-Fi도 없으면 connect가 실패한다. 터지지 말고 모른다고 답한다."""
        self.assertIsNone(self._address_when(lambda: ('192.168.0.27', 0), fail=True))

    def _address_when(self, sockname, fail=False):
        class FakeSocket:
            def __init__(self, *_args, **_kwargs):
                pass

            def connect(self, _addr):
                if fail:
                    raise OSError('unreachable')

            def getsockname(self):
                return sockname()

            def close(self):
                pass

        with patch.object(socket, 'socket', FakeSocket):
            return health._pick_lan_address()
