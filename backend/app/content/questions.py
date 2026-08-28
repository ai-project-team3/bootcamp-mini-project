# 얼음땡 기획안 §4-2, §4-3 문항 사전. 프론트 화면과 백엔드 산출식이 같은
# question_no/ability 매핑을 쓰도록 여기 한 곳에서만 정의한다.

# §4-2 첫인상 투표 ①/② — 5문항. 대응 능력치는 impression_pre/post(점선
# 레이더)에만 쓰이고 본값(§5 실선) 산출식에는 관여하지 않는다.
IMPRESSION_QUESTIONS = [
    {"question_no": 1, "text": "첫 회의에서 제일 먼저 말할 것 같은 사람은?", "ability": "DOM"},
    {"question_no": 2, "text": "결정을 제일 빨리 내릴 것 같은 사람은?", "ability": "SPD"},
    {"question_no": 3, "text": "발표를 제일 잘할 것 같은 사람은?", "ability": "EXP"},
    {"question_no": 4, "text": "힘들 때 제일 먼저 물어봐줄 것 같은 사람은?", "ability": "EMP"},
    {"question_no": 5, "text": "남의 거짓말을 제일 먼저 눈치챌 것 같은 사람은?", "ability": "OBS"},
]

# §4-3 동시에 답하기 — 이지선다 8문항. A가 해당 능력치의 높은 쪽.
EITHER_OR_QUESTIONS = [
    {"question_no": 1, "situation": "첫 회의, 아무도 말이 없다", "a": "내가 먼저 시작한다", "b": "누가 말할 때까지 기다린다", "ability": "DOM"},
    {"question_no": 2, "situation": "역할을 정한다", "a": "하고 싶은 걸 먼저 말한다", "b": "남는 걸 맡는다", "ability": "DOM"},
    {"question_no": 3, "situation": "방향이 틀린 것 같다", "a": "지금 말한다", "b": "일단 해보고 말한다", "ability": "DOM"},
    {"question_no": 4, "situation": "단톡방에 할 말이 생겼다", "a": "생각나면 바로 쓴다", "b": "정리해서 한 번에 쓴다", "ability": "EXP"},
    {"question_no": 5, "situation": "발표자를 정한다", "a": "내가 한다", "b": "남이 하면 좋겠다", "ability": "EXP"},
    {"question_no": 6, "situation": "아이디어가 떠올랐다", "a": "다듬기 전에 던진다", "b": "확신이 들 때만 꺼낸다", "ability": "EXP"},
    {"question_no": 7, "situation": "팀원이 마감을 놓쳤다", "a": "무슨 일 있냐고 먼저 묻는다", "b": "언제까지 되냐고 먼저 묻는다", "ability": "EMP"},
    {"question_no": 8, "situation": "의견이 갈렸다", "a": "소수 의견을 한 번 더 듣는다", "b": "다수로 빨리 정한다", "ability": "EMP"},
]

DOM_QUESTIONS = (1, 2, 3)
EXP_QUESTIONS = (4, 5, 6)
EMP_QUESTIONS = (7, 8)

IMPRESSION_QUESTION_NOS = tuple(q["question_no"] for q in IMPRESSION_QUESTIONS)
EITHER_OR_QUESTION_NOS = tuple(q["question_no"] for q in EITHER_OR_QUESTIONS)
