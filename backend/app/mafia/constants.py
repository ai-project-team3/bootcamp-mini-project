"""Domain constants shared across routers and game logic."""

from app.mafia.roles.capacity import SUPPORTED_PLAYER_COUNTS

# Room sizes the role-assignment table supports. Derived from the table itself
# so adding a row there is the only edit needed to allow a new room size.
ALLOWED_PLAYER_COUNTS = SUPPORTED_PLAYER_COUNTS

# Nickname prefix for the demo-only "fill test players" endpoint.
#: Names for the seats 혼자 해보기 fills, in order.
#:
#: Deliberately the same list the shared room uses (`services/demo_rooms`) and
#: the same first four the party games play with — a group walking in from
#: those games keeps the same faces. The list is copied rather than imported
#: because this package does not reach into the host app.
TEST_BOT_NICKNAMES = ("서준", "유나", "지안", "다온", "하람", "시우", "나린", "도윤", "소율")


def bot_nickname_for(index: int) -> str:
    """The name for the `index`-th filled seat, counting from zero."""
    name = TEST_BOT_NICKNAMES[index % len(TEST_BOT_NICKNAMES)]
    lap = index // len(TEST_BOT_NICKNAMES)
    return name if lap == 0 else f"{name}{lap + 1}"

# Which night action each role is allowed to submit. Anything else is rejected,
# so a citizen cannot send a "kill" and a non-police cannot send "investigate".
ROLE_NIGHT_ACTION = {
    "mafia": "kill",
    "police": "investigate",
    "doctor": "protect",
}
