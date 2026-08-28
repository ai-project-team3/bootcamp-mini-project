"""Server-side game state for Persona Marble.

The server owns the game so that two devices polling the same room always see
the same board, turn and quiz.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

BOARD_SIZE = 12

MIN_PLAYERS = 2
MAX_PLAYERS = 8


class ContentMode(str, Enum):
    GENERAL = "general"
    ADULT = "adult"


class TileType(str, Enum):
    START = "START"
    LOGIC = "LOGIC"
    EMPATHY = "EMPATHY"
    DRIVE = "DRIVE"
    CAUTION = "CAUTION"
    CHANCE = "CHANCE"


class GamePhase(str, Enum):
    WAITING = "WAITING"
    ROLL_DICE = "ROLL_DICE"
    SHOW_QUIZ = "SHOW_QUIZ"
    SUBMIT_ANSWER = "SUBMIT_ANSWER"
    GAME_OVER = "GAME_OVER"


class BenefitCard(str, Enum):
    EXTRA_ROLL = "EXTRA_ROLL"
    SCORE_DOUBLE = "SCORE_DOUBLE"
    FORFEIT_IMMUNITY = "FORFEIT_IMMUNITY"
    EXTRA_HOP = "EXTRA_HOP"
    SKIP_OPPONENT = "SKIP_OPPONENT"


TraitKey = str  # "stressRelief" | "conflictStyle" | "dateStyle" | "spontaneousAction"


@dataclass
class Tile:
    index: int
    type: TileType


@dataclass
class PersonaStats:
    logic: int
    empathy: int
    drive: int
    caution: int


@dataclass
class Persona:
    """Mirrors the frontend UserPersona / the external persona team's schema."""

    user_id: str
    nickname: str
    stats: PersonaStats
    traits: dict[TraitKey, str]


@dataclass
class Player:
    player_id: str
    nickname: str
    persona: Persona | None = None
    position: int = 0
    score: int = 0
    #: Total tiles advanced. Reaching BOARD_SIZE completes the lap and wins.
    steps_moved: int = 0
    active_benefit: BenefitCard | None = None
    skip_next_turn: bool = False


@dataclass
class Quiz:
    tile_type: TileType
    trait_key: TraitKey
    question: str
    choices: list[str]
    #: Never serialised to clients — it would hand the answer to the opponent.
    correct_index: int
    #: Which template produced this question, so the room can avoid repeating it.
    template_index: int


@dataclass
class ChanceCardResult:
    kind: str  # "benefit" | "penalty"
    benefit: BenefitCard | None = None
    forfeit_text: str | None = None


@dataclass
class Room:
    room_id: str
    content_mode: ContentMode
    phase: GamePhase = GamePhase.WAITING
    players: dict[str, Player] = field(default_factory=dict)
    turn_order: list[str] = field(default_factory=list)
    host_player_id: str | None = None
    current_player_id: str | None = None
    board: list[Tile] = field(default_factory=list)
    last_dice_roll: int | None = None
    pending_target_position: int | None = None
    quiz: Quiz | None = None
    last_answer_correct: bool | None = None
    assigned_forfeit: str | None = None
    last_chance_card: ChanceCardResult | None = None
    winner_id: str | None = None
    chemistry_summary: str | None = None
    #: Last question template used per trait, to avoid asking it twice in a row.
    last_template_index: dict[TraitKey, int] = field(default_factory=dict)
    #: Whose persona the open quiz is about. With more than two players the
    #: question has to name someone, so the UI reads it from here.
    quiz_subject_id: str | None = None
    #: Who receives the dare. Only set in adult mode, where a forfeit is
    #: something one person does to another; general-mode dares stand alone.
    forfeit_target_id: str | None = None
    #: Who a chance card just sent to the back of the queue, for the UI to say so.
    skipped_player_id: str | None = None
    #: Room size chosen when the room was created, 2 through 8.
    max_players: int = MIN_PLAYERS

    def is_full(self) -> bool:
        return len(self.players) >= self.max_players

    def others(self, player_id: str) -> list[Player]:
        """Everyone except the given player, in seating order."""
        return [self.players[pid] for pid in self.turn_order if pid != player_id]

    def opponent_of(self, player_id: str) -> Player | None:
        """The next player in seating order. Kept for the two-player case."""
        others = self.others(player_id)
        return others[0] if others else None
