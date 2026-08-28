"""Walk a whole session end to end at several room sizes.

Runs against an in-memory database through the real app, so it exercises the
routers rather than the scoring functions in isolation. Leaves nothing behind
and needs neither a database nor a running server.

    python scripts/flow_check.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.database import get_db  # noqa: E402
from app.models import *  # noqa: E402,F401,F403  — Base.metadata 채우기
from app.models.base import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.content.questions import EITHER_OR_QUESTION_NOS, IMPRESSION_QUESTION_NOS  # noqa: E402

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(engine)


def _db():
    db = Session()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _db
client = TestClient(app)

failures: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    mark = "OK  " if ok else "FAIL"
    print(f"  [{mark}] {label}{'  ' + detail if detail and not ok else ''}")
    if not ok:
        failures.append(label)


def phase(code: str) -> str:
    return client.get(f"/rooms/{code}").json()["phase"]


def run(n: int) -> None:
    print(f"\n=== {n}명 ===")

    created = client.post(
        "/rooms",
        json={"nickname": "호스트", "gender": "M", "mbti": "INTJ", "player_limit": n},
    )
    check("방 생성", created.status_code == 200, created.text)
    if created.status_code != 200:
        return
    room = created.json()
    code = room["code"]
    host_id = client.get(f"/rooms/{code}/players").json()[0]["id"]

    ids = [host_id]
    for i in range(2, n + 1):
        joined = client.post(
            f"/rooms/{code}/players",
            json={"nickname": f"P{i}", "gender": "F", "mbti": "ENFP"},
        )
        check(f"{i}번째 참가", joined.status_code == 200, joined.text)
        ids.append(joined.json()["id"])

    started = client.post(f"/rooms/{code}/start", json={"player_id": host_id})
    check("시작", started.status_code == 200, started.text)
    if started.status_code != 200:
        return

    guard = 0
    while (current := phase(code)) != "DONE":
        guard += 1
        if guard > 12:
            check(f"{current} 에서 멈춤", False)
            return

        if current in ("IMPRESSION_PRE", "IMPRESSION_POST"):
            rnd = "pre" if current == "IMPRESSION_PRE" else "post"
            for me in ids:
                others = [p for p in ids if p != me]
                votes = [
                    {"question_no": q, "target_player_id": others[i % len(others)]}
                    for i, q in enumerate(IMPRESSION_QUESTION_NOS)
                ]
                r = client.post(
                    f"/rooms/{code}/impressions/{rnd}",
                    json={"player_id": me, "votes": votes},
                )
                check(f"첫인상 {rnd} 제출", r.status_code == 200, r.text)

        elif current == "ANSWER":
            for q in EITHER_OR_QUESTION_NOS:
                for i, me in enumerate(ids):
                    r = client.post(
                        f"/rooms/{code}/answers/{q}",
                        json={"player_id": me, "choice": "A" if i % 2 == 0 else "B", "elapsed_ms": 4000},
                    )
                    check(f"문항 {q} 제출", r.status_code == 200, r.text)
                status = client.get(f"/rooms/{code}/answers/{q}/status").json()
                check(
                    f"문항 {q} 집계만 공개",
                    "results" not in status and status["count_a"] + status["count_b"] == n,
                    str(status),
                )

        elif current == "STATEMENT":
            for me in ids:
                r = client.post(
                    f"/rooms/{code}/statements",
                    json={
                        "player_id": me,
                        "statements": [
                            {"slot": 1, "text": "라면에 계란을 안 넣는다", "is_lie": False},
                            {"slot": 2, "text": "번지점프를 해봤다", "is_lie": True},
                            {"slot": 3, "text": "아침을 안 먹는다", "is_lie": False},
                        ],
                    },
                )
                check("문장 제출", r.status_code == 200, r.text)
            guard2 = 0
            while True:
                guard2 += 1
                if guard2 > 20:
                    check("거짓 찾기 턴이 안 끝남", False)
                    return
                turn = client.get(f"/rooms/{code}/statements/turn")
                if turn.status_code != 200:
                    check("턴 조회", False, turn.text)
                    return
                data = turn.json()
                if data.get("done") or not data.get("target_player_id"):
                    break
                tid = data["target_player_id"]
                for me in ids:
                    if me == tid:
                        continue
                    r = client.post(
                        f"/rooms/{code}/statements/{tid}/guess",
                        json={"guesser_id": me, "guessed_slot": 2},
                    )
                    if r.status_code != 200:
                        check("거짓 지목", False, r.text)
                        return

        elif current == "TYPE_GUESS":
            for me in ids:
                r = client.post(
                    f"/rooms/{code}/type-guess/self",
                    json={"player_id": me, "type_code": "T1"},
                )
                check("자기 유형 예측", r.status_code == 200, r.text)
            for me in ids:
                cards = client.get(f"/rooms/{code}/type-guess/cards", params={"player_id": me})
                check("카드 조회", cards.status_code == 200, cards.text)
                if cards.status_code != 200:
                    return
                deck = cards.json()
                others = [p for p in ids if p != me]
                payload = [
                    {"card_id": c["card_id"], "target_player_id": others[i]}
                    for i, c in enumerate(deck)
                ]
                r = client.post(
                    f"/rooms/{code}/type-guess/assign",
                    json={"player_id": me, "assignments": payload},
                )
                check("카드 배정", r.status_code == 200, r.text)

    check("DONE 도달", phase(code) == "DONE")

    report = client.get(f"/rooms/{code}/report")
    check("리포트 생성", report.status_code == 200, report.text)
    if report.status_code != 200:
        return
    body = report.json()
    check("인원수 일치", len(body["players"]) == n)
    check("팀 등급 있음", bool(body["team"]["rank"]))
    me = body["players"][0]
    check("능력치 5개", len(me["abilities"]) == 5, str(me["abilities"]))
    if n < 2:
        check("혼자면 관찰력 중립", me["abilities"]["OBS"] == 2.5, str(me["abilities"]["OBS"]))
    check("궁합 = 인원-1", len(me["compat"]) == n - 1)

    handoff = client.get(f"/rooms/{code}/persona")
    check("페르소나 인계", handoff.status_code == 200, handoff.text)
    if handoff.status_code == 200:
        h = handoff.json()
        check("인계 인원수", len(h["players"]) == n)
        scores = h["players"][0]["personaScores"]
        check("인계 5축", len(scores) == 5, str(scores))
        check(
            "인계 0~100 정수",
            all(isinstance(v, int) and 0 <= v <= 100 for v in scores.values()),
            str(scores),
        )


for size in (1, 2, 3, 5, 8):
    run(size)

print()
if failures:
    print(f"실패 {len(failures)}건")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
print("전부 통과")
