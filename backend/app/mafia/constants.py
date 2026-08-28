"""Domain constants shared across routers and game logic."""

from app.mafia.roles.capacity import SUPPORTED_PLAYER_COUNTS

# Room sizes the role-assignment table supports. Derived from the table itself
# so adding a row there is the only edit needed to allow a new room size.
ALLOWED_PLAYER_COUNTS = SUPPORTED_PLAYER_COUNTS

# Nickname prefix for the demo-only "fill test players" endpoint.
TEST_BOT_NICKNAME_PREFIX = "테스트봇"

# Which night action each role is allowed to submit. Anything else is rejected,
# so a citizen cannot send a "kill" and a non-police cannot send "investigate".
ROLE_NIGHT_ACTION = {
    "mafia": "kill",
    "police": "investigate",
    "doctor": "protect",
}
