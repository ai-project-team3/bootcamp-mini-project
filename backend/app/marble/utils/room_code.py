"""Human-typeable room codes — same rules as the mafia game so a player only
ever has to read six unambiguous characters aloud."""

import random
import string

_ALPHABET = "".join(c for c in string.ascii_uppercase + string.digits if c not in "0O1I")

CODE_LENGTH = 6


def generate_room_code(length: int = CODE_LENGTH) -> str:
    return "".join(random.choice(_ALPHABET) for _ in range(length))
