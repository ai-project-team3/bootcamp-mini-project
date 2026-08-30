"""Test bots taking their own turns.

This game has no clock: play sits on `current_player_id` until that player
acts. A seat filled by the demo's "혼자 해보기" button therefore stops the board
for everyone, which is exactly the situation someone testing alone is in. This
plays those seats.

One move per call, not the whole turn, because the caller is the state poll a
phone makes about once a second: the human watches the bot roll, sees the quiz,
sees the answer, rather than finding the turn already over.
"""

import random
import time

from app.marble.game import engine
from app.marble.models.room import GamePhase, Room

#: Seconds between one bot move and the next.
#:
#: Long enough to read the dice, the question and the answer. Without it the
#: bot rolls, answers and hands play on across three polls a second apart, and
#: its whole turn is over before anyone has seen the question.
BOT_MOVE_INTERVAL_SECONDS = 2.5


def take_pending_turn(
    room: Room,
    rng: random.Random | None = None,
    now: float | None = None,
) -> bool:
    """Play one move if the board is waiting on a bot. Returns whether it did."""
    moment = time.time() if now is None else now
    if moment - room.last_bot_action_at < BOT_MOVE_INTERVAL_SECONDS:
        return False
    player_id = room.current_player_id
    if player_id is None:
        return False
    player = room.players.get(player_id)
    if player is None or not player.is_bot:
        return False

    chooser = rng or random
    try:
        if room.phase is GamePhase.ROLL_DICE:
            engine.roll_dice(room, player_id)
        elif room.phase is GamePhase.SHOW_QUIZ:
            if room.quiz is None:
                return False
            engine.submit_answer(room, player_id, chooser.randrange(len(room.quiz.choices)))
        elif room.phase is GamePhase.SUBMIT_ANSWER:
            # The dare (or the result blurb) is addressed to a bot, so there is
            # nobody to acknowledge it. Hand play on.
            engine.advance_turn(room)
        else:
            return False
    except (engine.NotYourTurn, engine.InvalidPhase):
        # Two phones polled at once and the other request got there first.
        return False
    room.last_bot_action_at = moment
    return True
