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

# 기획안 §7 유형 8종. 주도력 × 표현력 × 관찰력을 2.5 기준으로 갈라 여덟 가지.
#
# 이름은 전부 "아무도 안 시켰는데 본인이 차지한 자리"라는 한 축으로 묶여 있다.
# 이름은 고정이고 부제만 프로젝트 맥락으로 매번 생성된다(§7) — 카드 이미지가
# 이름에 1:1로 붙어 있어서 이름이 바뀌면 이미지를 다시 만들어야 한다.
#
# image는 frontend/public/types/ 아래 파일명. 파일이 없으면 화면이 symbol로
# 대신 그린다(frontend/src/data/types.js).
TYPES = {
    "T1": {
        "dom": "H", "exp": "H", "obs": "H",
        "name": "셀프 사회자", "subtitle": "아무도 안 시켰는데 진행도 발언도 판단도 본인이",
        "color": "#FF2E88", "symbol": "🎤", "image": "/types/T1.webp",
    },
    "T2": {
        "dom": "H", "exp": "H", "obs": "L",
        "name": "직구 마스터", "subtitle": "할 말은 다 하는데 남 표정은 안 봅니다",
        "color": "#FF6B35", "symbol": "⚾", "image": "/types/T2.webp",
    },
    "T3": {
        "dom": "H", "exp": "L", "obs": "H",
        "name": "뒷자리 미어캣", "subtitle": "조용히 보다가 결정은 제일 먼저 냅니다",
        "color": "#FFC531", "symbol": "👀", "image": "/types/T3.webp",
    },
    "T4": {
        "dom": "H", "exp": "L", "obs": "L",
        "name": "무면허 라이더", "subtitle": "앞은 안 보고 액셀만 밟습니다",
        "color": "#FF4757", "symbol": "🏍️", "image": "/types/T4.webp",
    },
    "T5": {
        "dom": "L", "exp": "H", "obs": "H",
        "name": "방구석 박사", "subtitle": "다 알고 다 말하는데 정작 본인은 안 나섭니다",
        "color": "#7B61FF", "symbol": "🎓", "image": "/types/T5.webp",
    },
    "T6": {
        "dom": "L", "exp": "H", "obs": "L",
        "name": "MZ 응원단장", "subtitle": "판은 못 읽는데 텐션은 제일 높습니다",
        "color": "#C6FF4E", "symbol": "📣", "image": "/types/T6.webp",
    },
    "T7": {
        "dom": "L", "exp": "L", "obs": "H",
        "name": "은둔형 명탐정", "subtitle": "말 한마디 없이 다 맞혔습니다",
        "color": "#2E86FF", "symbol": "🔍", "image": "/types/T7.webp",
    },
    "T8": {
        "dom": "L", "exp": "L", "obs": "L",
        "name": "평화성애자", "subtitle": "아무하고도 안 부딪혔습니다. 아무것도 안 해서요",
        "color": "#7FD8C9", "symbol": "🕊️", "image": "/types/T8.webp",
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
