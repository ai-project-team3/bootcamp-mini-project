# 얼음땡 기획안 §2, §5~§9 기준값.

MAX_PLAYERS = 5

ABILITY_CODES = ("DOM", "SPD", "EXP", "EMP", "OBS")

ABILITY_LABELS = {
    "DOM": "주도력",
    "SPD": "순발력",
    "EXP": "표현력",
    "EMP": "공감력",
    "OBS": "관찰력",
}

# 기획안 §6 — 8유형. O1(색+심볼) 미확정이라 테마 팔레트 기반 임시값으로 채움.
TYPES = {
    "T1": {
        "dom": "H", "exp": "H", "obs": "H",
        "name": "판 짜는 사람", "subtitle": "다 보고 다 말하고 다 정한다",
        "color": "#E85D4E", "symbol": "🧭",
    },
    "T2": {
        "dom": "H", "exp": "H", "obs": "L",
        "name": "확성기", "subtitle": "말은 제일 많은데 남 얘긴 안 들림",
        "color": "#F2A93B", "symbol": "📢",
    },
    "T3": {
        "dom": "H", "exp": "L", "obs": "H",
        "name": "뒷자리 판사", "subtitle": "본인은 안 나서는데 판결은 다 내림",
        "color": "#4E6FE8", "symbol": "⚖️",
    },
    "T4": {
        "dom": "H", "exp": "L", "obs": "L",
        "name": "직진", "subtitle": "말은 아끼고 결정은 안 아낀다",
        "color": "#C24EE8", "symbol": "🚀",
    },
    "T5": {
        "dom": "L", "exp": "H", "obs": "H",
        "name": "해설위원", "subtitle": "다 알면서 정작 자기 패는 안 냄",
        "color": "#2FB6A3", "symbol": "🎙️",
    },
    "T6": {
        "dom": "L", "exp": "H", "obs": "L",
        "name": "분위기 담당", "subtitle": "무슨 말인지는 몰라도 재밌음",
        "color": "#F2586B", "symbol": "🎉",
    },
    "T7": {
        "dom": "L", "exp": "L", "obs": "H",
        "name": "CCTV", "subtitle": "말은 없는데 다 보고 있었음",
        "color": "#5B5FC7", "symbol": "📹",
    },
    "T8": {
        "dom": "L", "exp": "L", "obs": "L",
        "name": "정직한 무임승차", "subtitle": "오늘은 그냥 앉아 있었음",
        "color": "#8A8F98", "symbol": "🛋️",
    },
}

# 기획안 §7 — 칭호 10종. 조건 판정은 services/scoring.py에서 수행.
BADGES = (
    "관찰왕",
    "완벽한 거짓말쟁이",
    "첫인상 배신자",
    "예측대로",
    "최다 지목",
    "번개손",
    "제일 오래 고민한 사람",
    "소수파",
    "만장일치",
    "자기 예언자",
)

DEFAULT_BADGE = "예측대로"

# 기획안 §9 — 팀 등급, 상위 지표 개수 순
TEAM_GRADES_BY_HIT_COUNT = {4: "SSS", 3: "SS+", 2: "SS", 1: "S+", 0: "S"}

STATEMENT_MAX_LEN = 60  # O2(글자 수 상한) 가정값
