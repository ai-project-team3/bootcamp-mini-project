import random
import string

_ALPHABET = "".join(c for c in string.ascii_uppercase + string.digits if c not in "0O1I")


def generate_room_code(length: int = 6) -> str:
    return "".join(random.choice(_ALPHABET) for _ in range(length))
