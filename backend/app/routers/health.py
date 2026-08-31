import socket

from fastapi import APIRouter

from ..schemas.health import HealthResponse, LanAddressResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def check_health() -> HealthResponse:
    return HealthResponse()


@router.get("/health/lan", response_model=LanAddressResponse)
def lan_address() -> LanAddressResponse:
    """이 컴퓨터를 같은 Wi-Fi의 폰이 부를 수 있는 주소를 알려준다.

    QR에 담을 주소를 정하려고 프론트가 묻는다. 브라우저는 자기가 접속한 주소밖에
    모르는데, 그게 localhost면 폰에게는 쓸모가 없다 — 폰에서 localhost는 폰 자신이다.
    """
    return LanAddressResponse(host=_pick_lan_address())


def _pick_lan_address() -> str | None:
    """바깥으로 나가는 경로가 쓰는 랜카드의 주소.

    소켓을 열어 라우터 쪽으로 향하게만 해두고 커널이 고른 출발지 주소를 되묻는다.
    UDP라 패킷은 한 개도 나가지 않고, 8.8.8.8이 닿는지도 상관없다 — 경로표만 본다.
    호스트 이름을 되묻는 흔한 방법은 랜카드가 여럿일 때(VPN, 도커, 가상머신)
    엉뚱한 것을 집어서, 정작 폰이 못 닿는 주소를 QR에 박아 넣는다.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        host = sock.getsockname()[0]
    except OSError:
        return None
    finally:
        sock.close()
    return host if host and not host.startswith("127.") else None
