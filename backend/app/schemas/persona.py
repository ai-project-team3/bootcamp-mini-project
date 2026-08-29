from pydantic import BaseModel


class PersonaEntry(BaseModel):
    playerId: str  # noqa: N815 — 소비자(마피아) 스키마의 alias와 그대로 맞춘다
    nickname: str
    personaScores: dict[str, int]  # noqa: N815


class PersonaHandoffResponse(BaseModel):
    session_id: str
    scale: int  # 능력치 최대값. 0.0~5.0을 이 값으로 늘려 보낸다
    players: list[PersonaEntry]
