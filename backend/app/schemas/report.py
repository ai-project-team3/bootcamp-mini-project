from typing import Optional

from pydantic import BaseModel


class CompatEntry(BaseModel):
    nickname: str
    grade: str  # S | A | B
    tag: str  # 보완 | 닮음
    note: str


class PlayerReport(BaseModel):
    player_id: str
    nickname: str
    gender: str
    mbti: Optional[str] = None
    abilities: dict[str, float]
    impression_pre: dict[str, float]
    impression_post: dict[str, float]
    type_code: str
    self_guess: Optional[str] = None
    badges: list[str]
    quote: Optional[str] = None
    quote_note: Optional[str] = None
    compat: list[CompatEntry]
    comment_lines: list[str]


class TeamRole(BaseModel):
    role: str
    nickname: str
    why: str


class TeamReport(BaseModel):
    rank: str
    summary: str
    reasons: list[str]
    roles: list[TeamRole]
    highlights: list[str]


class RoomReportResponse(BaseModel):
    """Plan doc §15 JSON 계약(players[] + team{})."""

    session_id: str
    players: list[PlayerReport]
    team: TeamReport
