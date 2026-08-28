from unittest.mock import patch

import pytest

from app.marble.game import engine
from app.marble.models.room import (
    BOARD_SIZE,
    BenefitCard,
    ChanceCardResult,
    ContentMode,
    GamePhase,
    Persona,
    PersonaStats,
    Player,
    Quiz,
    Room,
    Tile,
    TileType,
)


def persona(user_id: str, nickname: str) -> Persona:
    return Persona(
        user_id=user_id,
        nickname=nickname,
        stats=PersonaStats(logic=50, empathy=50, drive=50, caution=50),
        traits={
            "stressRelief": "rest",
            "conflictStyle": "talk",
            "dateStyle": "walk",
            "spontaneousAction": "laugh",
        },
    )


# index 0 START, 1-8 LOGIC, 9-11 CHANCE
STANDARD = (
    [TileType.START]
    + [TileType.LOGIC] * 8
    + [TileType.CHANCE] * 3
)


def make_room(**overrides) -> Room:
    room = Room(room_id="r1", content_mode=ContentMode.GENERAL, phase=GamePhase.ROLL_DICE)
    room.players = {
        "a": Player(player_id="a", nickname="민수", persona=persona("a", "민수")),
        "b": Player(player_id="b", nickname="지은", persona=persona("b", "지은")),
    }
    room.turn_order = ["a", "b"]
    room.host_player_id = "a"
    room.current_player_id = "a"
    room.board = [Tile(index=i, type=t) for i, t in enumerate(STANDARD)]
    for key, value in overrides.items():
        setattr(room, key, value)
    return room


def staged_quiz(room: Room, *, roll: int, tile_type=TileType.LOGIC, correct_index=0):
    """Put the room where roll_dice would leave it: destination staged, quiz open."""
    mover = room.players[room.current_player_id]
    room.phase = GamePhase.SHOW_QUIZ
    room.last_dice_roll = roll
    room.pending_target_position = (mover.position + roll) % BOARD_SIZE
    room.quiz = Quiz(
        tile_type=tile_type,
        trait_key="conflictStyle",
        question="q",
        choices=["a", "b", "c", "d"],
        correct_index=correct_index,
        template_index=0,
    )
    return room


class TestRoll:
    def test_stages_a_destination_and_quiz_without_moving_yet(self):
        room = make_room()
        with patch("app.marble.game.engine.random.randint", return_value=1):
            engine.roll_dice(room, "a")
        assert room.players["a"].position == 0  # not moved until answered
        assert room.pending_target_position == 1
        assert room.phase is GamePhase.SHOW_QUIZ
        assert room.quiz is not None

    def test_landing_on_start_skips_the_quiz_and_passes_the_turn(self):
        room = make_room()
        room.players["a"].position = 11
        with patch("app.marble.game.engine.random.randint", return_value=1):
            engine.roll_dice(room, "a")
        assert room.quiz is None
        assert room.current_player_id == "b"
        assert room.phase is GamePhase.ROLL_DICE

    def test_rejects_a_roll_from_the_player_who_is_not_on_turn(self):
        room = make_room()
        with pytest.raises(engine.NotYourTurn):
            engine.roll_dice(room, "b")


class TestAnswer:
    def test_correct_answer_moves_scores_and_counts_steps(self):
        room = staged_quiz(make_room(), roll=3)
        engine.submit_answer(room, "a", 0)
        assert room.players["a"].position == 3
        assert room.players["a"].score == 10
        assert room.players["a"].steps_moved == 3
        assert room.last_answer_correct is True
        assert room.assigned_forfeit is None

    def test_wrong_answer_keeps_the_player_in_place_and_assigns_a_forfeit(self):
        room = staged_quiz(make_room(), roll=3)
        engine.submit_answer(room, "a", 1)
        assert room.players["a"].position == 0
        assert room.players["a"].steps_moved == 0
        assert room.players["a"].score == 0
        assert room.last_answer_correct is False
        assert room.assigned_forfeit is not None

    def test_score_double_is_consumed_on_the_next_correct_answer(self):
        room = staged_quiz(make_room(), roll=2)
        room.players["a"].active_benefit = BenefitCard.SCORE_DOUBLE
        engine.submit_answer(room, "a", 0)
        assert room.players["a"].score == 20
        assert room.players["a"].active_benefit is None

    def test_forfeit_immunity_is_consumed_instead_of_assigning_a_forfeit(self):
        room = staged_quiz(make_room(), roll=2)
        room.players["a"].active_benefit = BenefitCard.FORFEIT_IMMUNITY
        engine.submit_answer(room, "a", 1)
        assert room.assigned_forfeit is None
        assert room.players["a"].active_benefit is None

    def test_wrapping_past_start_keeps_position_on_the_board(self):
        room = make_room()
        room.players["a"].position = 11
        staged_quiz(room, roll=2)  # 11 + 2 -> index 1
        engine.submit_answer(room, "a", 0)
        assert room.players["a"].position == 1


class TestLapVictory:
    def test_completing_the_lap_wins_immediately(self):
        room = make_room()
        room.players["a"].position = 10
        room.players["a"].steps_moved = BOARD_SIZE - 3
        staged_quiz(room, roll=3)
        engine.submit_answer(room, "a", 0)
        assert room.players["a"].steps_moved >= BOARD_SIZE
        assert room.winner_id == "a"
        assert room.phase is GamePhase.GAME_OVER
        assert room.chemistry_summary

    def test_passing_start_counts_no_exact_landing_required(self):
        room = make_room()
        room.players["a"].position = 11
        room.players["a"].steps_moved = BOARD_SIZE - 2
        staged_quiz(room, roll=3)  # overshoots the start tile
        engine.submit_answer(room, "a", 0)
        assert room.players["a"].steps_moved > BOARD_SIZE
        assert room.winner_id == "a"

    def test_extra_hop_can_complete_the_lap(self):
        room = make_room()
        room.players["a"].position = 6
        room.players["a"].steps_moved = BOARD_SIZE - 4
        staged_quiz(room, roll=3, tile_type=TileType.CHANCE)  # 8 + 3 = 11, then +1 hop
        with patch(
            "app.marble.game.engine.draw_chance_card",
            return_value=ChanceCardResult(kind="benefit", benefit=BenefitCard.EXTRA_HOP),
        ):
            engine.submit_answer(room, "a", 0)
        assert room.players["a"].steps_moved == BOARD_SIZE
        assert room.winner_id == "a"

    def test_game_does_not_end_before_a_full_lap(self):
        room = staged_quiz(make_room(), roll=3)
        engine.submit_answer(room, "a", 0)
        assert room.winner_id is None
        assert room.phase is GamePhase.SUBMIT_ANSWER

    def test_there_is_no_turn_limit(self):
        """Many turns pass without the game ending on its own."""
        room = make_room()
        for _ in range(40):
            if room.phase is GamePhase.GAME_OVER:
                break
            engine.advance_turn(room) if room.phase is GamePhase.SUBMIT_ANSWER else None
            room.phase = GamePhase.SUBMIT_ANSWER
        assert room.winner_id is None


class TestChanceCards:
    def test_skip_opponent_marks_the_other_player(self):
        room = staged_quiz(make_room(), roll=3, tile_type=TileType.CHANCE)
        with patch(
            "app.marble.game.engine.draw_chance_card",
            return_value=ChanceCardResult(kind="benefit", benefit=BenefitCard.SKIP_OPPONENT),
        ):
            engine.submit_answer(room, "a", 0)
        assert room.players["b"].skip_next_turn is True

    def test_penalty_card_assigns_a_forfeit_even_though_the_answer_was_right(self):
        room = staged_quiz(make_room(), roll=3, tile_type=TileType.CHANCE)
        with patch(
            "app.marble.game.engine.draw_chance_card",
            return_value=ChanceCardResult(kind="penalty", forfeit_text="벌칙!"),
        ):
            engine.submit_answer(room, "a", 0)
        assert room.last_answer_correct is True
        assert room.assigned_forfeit == "벌칙!"


class TestAdvanceTurn:
    def test_passes_the_turn_to_the_opponent(self):
        room = make_room(phase=GamePhase.SUBMIT_ANSWER)
        engine.advance_turn(room)
        assert room.current_player_id == "b"
        assert room.phase is GamePhase.ROLL_DICE

    def test_extra_roll_keeps_the_same_player(self):
        room = make_room(phase=GamePhase.SUBMIT_ANSWER)
        room.last_chance_card = ChanceCardResult(kind="benefit", benefit=BenefitCard.EXTRA_ROLL)
        engine.advance_turn(room)
        assert room.current_player_id == "a"
        assert room.phase is GamePhase.ROLL_DICE

    def test_skips_a_player_whose_flag_is_set(self):
        room = make_room(phase=GamePhase.SUBMIT_ANSWER)
        room.players["b"].skip_next_turn = True
        engine.advance_turn(room)
        assert room.current_player_id == "a"
        assert room.players["b"].skip_next_turn is False
