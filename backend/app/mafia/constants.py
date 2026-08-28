"""Domain constants shared across routers and game logic."""

# Room sizes the role-assignment table supports (docs/mafia_game_design.md).
ALLOWED_PLAYER_COUNTS = (4, 5, 6)

# Nickname prefix for the demo-only "fill test players" endpoint.
TEST_BOT_NICKNAME_PREFIX = "테스트봇"

# Which night action each role is allowed to submit. Anything else is rejected,
# so a citizen cannot send a "kill" and a non-police cannot send "investigate".
ROLE_NIGHT_ACTION = {
    "mafia": "kill",
    "police": "investigate",
    "doctor": "protect",
}
