import random
from abc import ABC, abstractmethod

from app.mafia.models.persona import PersonaScores, PERSONA_AXES


class PersonaProvider(ABC):
    """실제 성향 데이터 팀의 API를 감싸는 구현체(RealPersonaProvider)를
    같은 인터페이스로 추가하면, 이 인터페이스를 사용하는 코드는 전혀
    수정할 필요가 없다."""

    @abstractmethod
    def get_personas(self, player_ids: list[str]) -> dict[str, PersonaScores]:
        ...


class MockPersonaProvider(PersonaProvider):
    def __init__(self, seed: int | None = None) -> None:
        self._rng = random.Random(seed)

    def get_personas(self, player_ids: list[str]) -> dict[str, PersonaScores]:
        return {
            player_id: PersonaScores(
                **{axis: self._rng.randint(0, 100) for axis in PERSONA_AXES}
            )
            for player_id in player_ids
        }
