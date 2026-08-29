"""Survey items. Plan doc §9.

Each choice carries its own signed `value`, so two-choice, three-choice and
ordered four-choice items all score through one code path and reverse-keyed
items need no special handling at runtime. `reverse` is kept purely as a design
note for whoever reviews the wording later.

Item value scales, from §9-2:
    two choices      +1            -1
    three choices    +1     0      -1
    ordered four     +1  +1/3  -1/3  -1
"""

_Q = 1.0 / 3.0

SURVEY_ITEMS: dict[str, list[dict]] = {
    "TP": [
        {
            "id": "DOM-1",
            "axis": "DOM",
            "reverse": False,
            "text": "조가 짜이고 첫 회의. 아무도 말을 안 꺼낸다.",
            "choices": [
                {"key": "A", "text": "일단 내가 뭐부터 할지 꺼낸다", "value": 1.0},
                {"key": "B", "text": "누가 먼저 말하나 조금 기다린다", "value": -1.0},
            ],
        },
        {
            "id": "DOM-2",
            "axis": "DOM",
            "reverse": True,
            "text": "역할을 나누는 중이다.",
            "choices": [
                {"key": "A", "text": "남는 자리를 맡는다", "value": -1.0},
                {"key": "B", "text": "내가 할 걸 먼저 고른다", "value": 1.0},
            ],
        },
        {
            "id": "SPD-1",
            "axis": "SPD",
            "reverse": False,
            "text": "아이디어가 하나 나왔다. 나쁘지 않다.",
            "choices": [
                {"key": "A", "text": "일단 그걸로 가보자고 한다", "value": 1.0},
                {"key": "B", "text": "다른 것도 몇 개 더 보자고 한다", "value": -1.0},
            ],
        },
        {
            "id": "SPD-2",
            "axis": "SPD",
            "reverse": True,
            "text": "자료를 찾다가 괜찮은 걸 발견했다.",
            "choices": [
                {"key": "A", "text": "더 좋은 게 있는지 조금 더 본다", "value": -1.0},
                {"key": "B", "text": "이거면 됐다 하고 덮는다", "value": 1.0},
            ],
        },
        {
            "id": "EXP-1",
            "axis": "EXP",
            "reverse": False,
            "text": "팀원이 가져온 결과물이 방향이 좀 다르다.",
            "choices": [
                {"key": "A", "text": "다른 것 같다고 그 자리에서 말한다", "value": 1.0},
                {"key": "B", "text": "일단 좋다고 하고 나중에 돌려 말한다", "value": -1.0},
            ],
        },
        {
            "id": "EXP-2",
            "axis": "EXP",
            "reverse": True,
            "text": "회의 시간이 자꾸 길어진다.",
            "choices": [
                {"key": "A", "text": "답답해도 흐름이 끊길까 봐 참는다", "value": -1.0},
                {"key": "B", "text": "그만하고 정하자고 한다", "value": 1.0},
            ],
        },
        {
            "id": "PLN-1",
            "axis": "PLN",
            "reverse": False,
            "text": "2주짜리 과제를 받았다.",
            "choices": [
                {"key": "A", "text": "주차별로 할 일을 먼저 적는다", "value": 1.0},
                {"key": "B", "text": "일단 시작하고 상황 봐서 정한다", "value": -1.0},
            ],
        },
        {
            "id": "PLN-2",
            "axis": "PLN",
            "reverse": True,
            "text": "갑자기 일정이 하루 당겨졌다.",
            "choices": [
                {"key": "A", "text": "남은 걸 그때그때 쳐낸다", "value": -1.0},
                {"key": "B", "text": "계획을 다시 짜고 움직인다", "value": 1.0},
            ],
        },
        {
            "id": "OPN-1",
            "axis": "OPN",
            "reverse": False,
            "text": "전에 써본 적 없는 툴을 쓰자는 얘기가 나왔다.",
            "choices": [
                {"key": "A", "text": "재밌겠다, 해보자", "value": 1.0},
                {"key": "B", "text": "익숙한 걸로 가는 게 안전하다", "value": -1.0},
            ],
        },
        {
            "id": "OPN-2",
            "axis": "OPN",
            "reverse": True,
            "text": "작년 선배들 자료가 남아 있다.",
            "choices": [
                {"key": "A", "text": "그거 참고해서 비슷하게 간다", "value": -1.0},
                {"key": "B", "text": "보긴 보되 다른 방향으로 짠다", "value": 1.0},
            ],
        },
        {
            "id": "EMP-1",
            "axis": "EMP",
            "reverse": False,
            "text": "한 명이 계속 늦고 진도가 안 나온다.",
            "choices": [
                {"key": "A", "text": "무슨 일 있는지 먼저 물어본다", "value": 1.0},
                {"key": "B", "text": "일정을 다시 맞추자고 한다", "value": 0.0},
                {"key": "C", "text": "이대로면 못 한다고 짚는다", "value": -1.0},
            ],
        },
        {
            "id": "EMP-2",
            "axis": "EMP",
            "reverse": True,
            "text": "결과물 퀄리티와 팀 분위기가 부딪힌다.",
            "choices": [
                {"key": "A", "text": "퀄리티가 먼저다", "value": -1.0},
                {"key": "B", "text": "분위기 깨지면 어차피 안 나온다", "value": 1.0},
            ],
        },
        {
            "id": "TP_DDL-1",
            "axis": "TP_DDL",
            "reverse": False,
            "text": "마감이 2주 남았다.",
            "choices": [
                {"key": "A", "text": "첫 주에 절반 이상 끝낸다", "value": 1.0},
                {"key": "B", "text": "마지막 3일에 몰아서 한다", "value": -1.0},
            ],
        },
        {
            "id": "TP_DDL-2",
            "axis": "TP_DDL",
            "reverse": True,
            "text": "진도가 계획보다 앞섰다.",
            "choices": [
                {"key": "A", "text": "여유가 생겼으니 좀 쉰다", "value": -1.0},
                {"key": "B", "text": "다음 것까지 당겨서 한다", "value": 1.0},
            ],
        },
        {
            "id": "TP_CFL-1",
            "axis": "TP_CFL",
            "reverse": False,
            "text": "회의에서 두 사람 의견이 부딪혔다.",
            "choices": [
                {"key": "A", "text": "지금 정하고 가자고 한다", "value": 1.0},
                {"key": "B", "text": "일단 넘어가고 나중에 본다", "value": -1.0},
            ],
        },
        {
            "id": "TP_CFL-2",
            "axis": "TP_CFL",
            "reverse": True,
            "text": "누가 내 파트를 마음대로 고쳤다.",
            "choices": [
                {"key": "A", "text": "별말 안 하고 넘어간다", "value": -1.0},
                {"key": "B", "text": "왜 고쳤는지 물어본다", "value": 1.0},
            ],
        },
        {
            "id": "TP_ROL-1",
            "axis": "TP_ROL",
            "reverse": False,
            "text": "발표자를 정해야 한다.",
            "choices": [
                {"key": "A", "text": "내가 한다고 한다", "value": 1.0},
                {"key": "B", "text": "자료 만드는 쪽을 맡는다", "value": -1.0},
            ],
        },
        {
            "id": "TP_ROL-2",
            "axis": "TP_ROL",
            "reverse": True,
            "text": "팀장을 뽑는다.",
            "choices": [
                {"key": "A", "text": "하겠다는 사람 있으면 밀어준다", "value": -1.0},
                {"key": "B", "text": "아무도 안 하면 내가 한다", "value": 1.0},
            ],
        },
    ],
    # MT / DY / NT items are written out in the plan doc §9-4~9-6 and get ported
    # here once TP is verified end to end. Plan doc §18: finish TP vertically first.
    "MT": [],
    "DY": [],
    "NT": [],
}

# Kept so the ordered-four scale is importable rather than re-typed per item.
ORDERED_FOUR = (1.0, _Q, -_Q, -1.0)


def items_for(category: str) -> list[dict]:
    return SURVEY_ITEMS.get(category, [])


def item_index(category: str) -> dict[str, dict]:
    return {item["id"]: item for item in items_for(category)}
