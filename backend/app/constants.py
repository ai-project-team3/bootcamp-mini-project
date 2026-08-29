# 얼음땡 기획안 §2, §5~§9 기준값.

# 기획안은 5명 고정을 전제하지만(§2), 테스트·소규모 진행 편의를 위해 방마다
# 인원을 설정할 수 있게 했다(사용자 요청). 실제 정원은 Room.player_limit에
# 저장되며, 여기 값은 그 허용 범위일 뿐이다.
MIN_PLAYERS = 1
MAX_PLAYERS = 8
DEFAULT_PLAYER_LIMIT = 5

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
        "name": "즉석 팀장", "subtitle": "묻지도 않았는데 회의를 이끈다",
        "color": "#E85D4E", "symbol": "🧭",
    },
    "T2": {
        "dom": "H", "exp": "H", "obs": "L",
        "name": "마이크 독점러", "subtitle": "남 얘기 끝나기 전에 다음 말 준비 중",
        "color": "#F2A93B", "symbol": "📢",
    },
    "T3": {
        "dom": "H", "exp": "L", "obs": "H",
        "name": "그림자 결재권자", "subtitle": "말은 없어도 결정은 이 사람 몫",
        "color": "#4E6FE8", "symbol": "⚖️",
    },
    "T4": {
        "dom": "H", "exp": "L", "obs": "L",
        "name": "불도저", "subtitle": "질문은 안 받고 통보만 한다",
        "color": "#C24EE8", "symbol": "🚀",
    },
    "T5": {
        "dom": "L", "exp": "H", "obs": "H",
        "name": "만능 관전러", "subtitle": "분석은 완벽한데 참전은 안 한다",
        "color": "#2FB6A3", "symbol": "🎙️",
    },
    "T6": {
        "dom": "L", "exp": "H", "obs": "L",
        "name": "분위기 메이커", "subtitle": "무슨 얘기였는진 몰라도 일단 웃겼다",
        "color": "#F2586B", "symbol": "🎉",
    },
    "T7": {
        "dom": "L", "exp": "L", "obs": "H",
        "name": "인간 CCTV", "subtitle": "존재감은 없어도 다 기억하고 있다",
        "color": "#5B5FC7", "symbol": "📹",
    },
    "T8": {
        "dom": "L", "exp": "L", "obs": "L",
        "name": "인간 배경", "subtitle": "오늘 여기 있었다는 것만은 확실하다",
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
