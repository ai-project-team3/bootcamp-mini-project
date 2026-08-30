"""Game state transitions.

The server is the referee: every action checks that it came from the player
whose turn it is, so two devices polling the same room cannot desync.

Core rule: a player only advances by answering correctly. The first player to
travel a full lap (BOARD_SIZE tiles) wins immediately — passing the start tile
counts, no exact landing required.
"""

from __future__ import annotations

import random

from app.marble.game.board import generate_board
from app.marble.game.cards import draw_chance_card, needs_forfeit_target, pick_forfeit
from app.marble.game.chemistry import summarize_chemistry
from app.marble.game.quiz import generate_quiz
from app.marble.models.room import (
    BOARD_SIZE,
    BenefitCard,
    GamePhase,
    Player,
    Room,
    TileType,
)

BASE_POINTS = 10
DICE_MAX = 3


class NotYourTurn(Exception):
    """Raised when a player acts out of turn."""


class InvalidPhase(Exception):
    """Raised when an action does not apply to the room's current phase."""


def _require_turn(room: Room, player_id: str) -> None:
    if room.current_player_id != player_id:
        raise NotYourTurn(f"It is not {player_id}'s turn")


def _clear_transient(room: Room) -> None:
    room.last_dice_roll = None
    room.quiz = None
    room.pending_target_position = None
    room.last_answer_correct = None
    room.assigned_forfeit = None
    room.last_chance_card = None
    room.quiz_subject_id = None
    room.forfeit_target_id = None
    room.skipped_player_id = None


def _assign_forfeit(room: Room, player_id: str) -> None:
    """Hand out a dare, drawing a target when the mode calls for one."""
    room.assigned_forfeit = pick_forfeit(room.content_mode)
    room.forfeit_target_id = None
    if not needs_forfeit_target(room.content_mode):
        return
    candidates = room.others(player_id)
    if candidates:
        room.forfeit_target_id = random.choice(candidates).player_id


def start_game(room: Room) -> None:
    if not room.is_full():
        raise InvalidPhase("Room is not full yet")

    everyone = [room.players[pid] for pid in room.turn_order]
    assert all(p.persona for p in everyone)
    room.board = generate_board(*(p.persona.stats for p in everyone if p.persona))

    for player in room.players.values():
        player.position = 0
        player.score = 0
        player.steps_moved = 0
        player.active_benefit = None
        player.skip_next_turn = False

    room.winner_id = None
    room.chemistry_summary = None
    room.last_template_index = {}
    room.current_player_id = room.turn_order[0]
    room.phase = GamePhase.ROLL_DICE
    _clear_transient(room)


def roll_dice(room: Room, player_id: str) -> None:
    _require_turn(room, player_id)
    if room.phase is not GamePhase.ROLL_DICE:
        raise InvalidPhase("Not waiting for a dice roll")

    roll = random.randint(1, DICE_MAX)
    mover = room.players[player_id]
    target = (mover.position + roll) % BOARD_SIZE
    tile = room.board[target]

    room.last_dice_roll = roll

    # The start tile has no quiz; the mover simply lands there and play passes on.
    if tile.type is TileType.START:
        _apply_move(room, player_id, target, roll)
        if room.winner_id is None:
            advance_turn(room, keep_dice=True)
        return

    # With more than two players the question has to be about someone in
    # particular, so the subject is drawn and recorded for the UI to name.
    subject = random.choice(room.others(player_id))
    assert subject.persona
    room.quiz_subject_id = subject.player_id
    room.quiz = generate_quiz(
        subject.persona,
        tile.type,
        room.content_mode,
        avoid_template_index=room.last_template_index.get(_trait_for(tile.type)),
    )
    room.last_template_index[room.quiz.trait_key] = room.quiz.template_index
    room.pending_target_position = target
    room.phase = GamePhase.SHOW_QUIZ


def _trait_for(tile_type: TileType) -> str:
    from app.marble.game.quiz import TILE_TRAIT_MAP

    return TILE_TRAIT_MAP.get(tile_type, "")


def _apply_move(room: Room, player_id: str, target_position: int, steps: int) -> None:
    """Commit a move and check whether it completes the lap."""
    player = room.players[player_id]
    player.position = target_position
    player.steps_moved += steps

    if player.steps_moved >= BOARD_SIZE:
        _finish(room, winner_id=player_id)


def _finish(room: Room, winner_id: str | None) -> None:
    room.winner_id = winner_id
    room.phase = GamePhase.GAME_OVER
    room.chemistry_summary = summarize_chemistry(
        [room.players[pid] for pid in room.turn_order], winner_id
    )


def submit_answer(room: Room, player_id: str, choice_index: int) -> None:
    _require_turn(room, player_id)
    if room.phase is not GamePhase.SHOW_QUIZ or room.quiz is None:
        raise InvalidPhase("No quiz is open")
    if room.pending_target_position is None:
        raise InvalidPhase("No pending move")

    quiz = room.quiz
    player = room.players[player_id]
    is_correct = choice_index == quiz.correct_index

    room.last_answer_correct = is_correct
    room.last_chance_card = None
    room.assigned_forfeit = None
    room.forfeit_target_id = None

    if not is_correct:
        # Stay put; perform a dare instead.
        if player.active_benefit is BenefitCard.FORFEIT_IMMUNITY:
            player.active_benefit = None
        else:
            _assign_forfeit(room, player_id)
        room.phase = GamePhase.SUBMIT_ANSWER
        return

    doubled = player.active_benefit is BenefitCard.SCORE_DOUBLE
    player.score += BASE_POINTS * 2 if doubled else BASE_POINTS
    if doubled:
        player.active_benefit = None

    steps = room.last_dice_roll or 0
    _apply_move(room, player_id, room.pending_target_position, steps)
    room.pending_target_position = None

    if quiz.tile_type is TileType.CHANCE and room.winner_id is None:
        _apply_chance_card(room, player_id)

    if room.winner_id is None:
        room.phase = GamePhase.SUBMIT_ANSWER


def _apply_chance_card(room: Room, player_id: str) -> None:
    # Only reached after a correct answer, so the draw is benefits-only: a
    # player who got the question right is never handed a dare.
    card = draw_chance_card(room.content_mode, benefits_only=True)
    room.last_chance_card = card
    player = room.players[player_id]

    if card.kind == "penalty":  # pragma: no cover - benefits_only rules this out
        room.assigned_forfeit = card.forfeit_text
        room.forfeit_target_id = None
        if needs_forfeit_target(room.content_mode):
            candidates = room.others(player_id)
            if candidates:
                room.forfeit_target_id = random.choice(candidates).player_id
        return

    if card.benefit in (BenefitCard.SCORE_DOUBLE, BenefitCard.FORFEIT_IMMUNITY):
        player.active_benefit = card.benefit
    elif card.benefit is BenefitCard.EXTRA_HOP:
        _apply_move(room, player_id, (player.position + 1) % BOARD_SIZE, 1)
    elif card.benefit is BenefitCard.SKIP_OPPONENT:
        candidates = room.others(player_id)
        if candidates:
            victim = random.choice(candidates)
            victim.skip_next_turn = True
            room.skipped_player_id = victim.player_id
    # EXTRA_ROLL is handled in advance_turn.


def advance_turn(room: Room, keep_dice: bool = False) -> None:
    if room.winner_id is not None:
        return

    card = room.last_chance_card
    extra_roll = card is not None and card.kind == "benefit" and card.benefit is BenefitCard.EXTRA_ROLL

    last_roll = room.last_dice_roll
    _clear_transient(room)
    if keep_dice:
        room.last_dice_roll = last_roll

    room.phase = GamePhase.ROLL_DICE

    if extra_roll:
        return  # same player rolls again

    current = room.current_player_id
    assert current is not None
    room.current_player_id = _next_player_id(room, current)


def _next_player_id(room: Room, current: str) -> str:
    """Walk the seating order, burning the skip flag of anyone who has one.

    The loop is bounded by the table size so a room where everyone is skipped
    still hands the turn back to the current player instead of spinning.
    """
    order = room.turn_order
    index = order.index(current)
    for step in range(1, len(order) + 1):
        candidate = order[(index + step) % len(order)]
        if candidate == current:
            return current
        player: Player = room.players[candidate]
        if player.skip_next_turn:
            player.skip_next_turn = False
            continue
        return candidate
    return current
