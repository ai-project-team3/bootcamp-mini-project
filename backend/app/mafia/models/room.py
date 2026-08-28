from dataclasses import dataclass, field
from enum import Enum

from app.mafia.models.persona import PersonaScores


class GamePhase(str, Enum):
    WAITING_ROOM = "WAITING_ROOM"
    ROLE_ASSIGNMENT = "ROLE_ASSIGNMENT"
    DAY_DISCUSSION = "DAY_DISCUSSION"
    DAY_VOTE = "DAY_VOTE"
    FINAL_DEFENSE = "FINAL_DEFENSE"
    EXECUTION_VOTE = "EXECUTION_VOTE"
    NIGHT_ACTION = "NIGHT_ACTION"
    RESULT = "RESULT"


@dataclass
class Player:
    player_id: str
    nickname: str
    is_alive: bool = True
    role: str | None = None
    assigned_score: float | None = None
    assigned_by: str | None = None


@dataclass
class Room:
    room_id: str
    player_count: int
    players: dict[str, Player] = field(default_factory=dict)
    personas: dict[str, PersonaScores] = field(default_factory=dict)
    phase: GamePhase = GamePhase.WAITING_ROOM
    day_number: int = 0
    night_number: int = 0
    votes: dict[str, str] = field(default_factory=dict)
    votes_confirmed: set[str] = field(default_factory=set)
    accused_player_id: str | None = None
    execution_votes: dict[str, str] = field(default_factory=dict)
    execution_confirmed: set[str] = field(default_factory=set)
    night_actions: dict[str, tuple[str, str]] = field(default_factory=dict)
    investigation_result: dict | None = None
    night_summary: dict | None = None
    execution_result: dict | None = None
    winner: str | None = None
    host_player_id: str | None = None
    phase_deadline: float | None = None
