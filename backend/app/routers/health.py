from fastapi import APIRouter

from ..schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def check_health() -> HealthResponse:
    return HealthResponse()
