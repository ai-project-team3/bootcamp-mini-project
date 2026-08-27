# Plan doc §3: category <-> frame mapping
CATEGORY_FRAME = {
    "TP": "MANY",
    "MT": "MANY",
    "DY": "PAIR",
    "NT": "PAIR",
}

VALID_CATEGORIES = set(CATEGORY_FRAME.keys())

# Plan doc §3: frame <-> max participant count
FRAME_MAX_PARTICIPANTS = {
    "PAIR": 2,
    "MANY": 8,
}
