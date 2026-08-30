"""Human-typeable room codes.

Six characters, drawn from an alphabet with the confusable glyphs (0/O, 1/I)
removed so a code read aloud across a table cannot be mistyped.
"""

import random
import string

_ALPHABET = "".join(c for c in string.ascii_uppercase + string.digits if c not in "0O1I")

CODE_LENGTH = 6


def generate_room_code(length: int = CODE_LENGTH) -> str:
    return "".join(random.choice(_ALPHABET) for _ in range(length))
