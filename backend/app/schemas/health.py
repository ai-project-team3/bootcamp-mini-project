from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"


class LanAddressResponse(BaseModel):
    """이 서버를 같은 네트워크의 다른 기기가 부를 수 있는 주소."""

    #: 찾지 못하면 None. 랜에 안 붙어 있거나 주소를 못 고른 경우다.
    host: str | None = None
