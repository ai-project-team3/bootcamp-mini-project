"""End-to-end smoke run against an in-memory SQLite database.

Needs no MariaDB and writes nothing. Walks the flow a real session takes: two
anonymous accounts, a room, a join, the host starting, both people answering all
18 items, and the SELF axis rows that fall out of that.

    cd backend
    python scripts/smoke.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DB_URL", "sqlite://")

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.database as database  # noqa: E402

# One shared in-memory connection; without StaticPool every session would open a
# fresh, empty database.
engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
database.engine = engine
database.SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

from fastapi.testclient import TestClient  # noqa: E402

from app.data.survey_items import items_for  # noqa: E402
from app.database import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402
from app.models.axis_score import AxisScore  # noqa: E402

Base.metadata.create_all(bind=engine)


def _get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _get_db

client = TestClient(app)
failures: list[str] = []


def check(label: str, condition: bool, extra: object = "") -> None:
    tail = f" — {extra}" if extra != "" else ""
    print(f"{'PASS' if condition else 'FAIL'}  {label}{tail}")
    if not condition:
        failures.append(label)


def answers_picking(items: list[dict], sign: int) -> dict[str, str]:
    """Per item, the choice whose stored value points the wanted way."""
    return {
        item["id"]: max(item["choices"], key=lambda ch: ch["value"] * sign)["key"]
        for item in items
    }


def main() -> int:
    # accounts
    host = client.post("/users").json()
    guest = client.post("/users").json()
    check("anonymous account issued", bool(host["user_id"]), host["user_id"][:8])
    check("second account is distinct", host["user_id"] != guest["user_id"])

    client.patch(f"/users/{host['user_id']}", json={"nickname": "종훈", "gender": "MALE"})
    client.patch(f"/users/{guest['user_id']}", json={"nickname": "서연", "gender": "FEMALE"})
    check("profile persists", client.get(f"/users/{host['user_id']}").json()["nickname"] == "종훈")
    check("unknown user is 404", client.get("/users/nope").status_code == 404)

    # room
    room = client.post("/rooms", json={"category": "TP", "user_id": host["user_id"]}).json()
    code = room["code"]
    check("server issued room code", len(code) == 6, code)
    check("frame derived from category", room["frame"] == "MANY")
    check("room starts WAITING", room["status"] == "WAITING")
    check(
        "bad category rejected",
        client.post("/rooms", json={"category": "ZZ", "user_id": host["user_id"]}).status_code
        == 400,
    )

    client.post(f"/rooms/{code}/participants", json={"user_id": guest["user_id"]})
    people = client.get(f"/rooms/{code}/participants").json()
    check("host + guest present", len(people) == 2, [p["nickname"] for p in people])
    check("host flagged", sum(1 for p in people if p["is_host"]) == 1)
    check("participant carries user_id", all(p["user_id"] for p in people))

    client.post(f"/rooms/{code}/participants", json={"user_id": guest["user_id"]})
    check("rejoin does not duplicate", len(client.get(f"/rooms/{code}/participants").json()) == 2)

    # start
    check(
        "guest cannot start",
        client.post(f"/rooms/{code}/start", json={"user_id": guest["user_id"]}).status_code == 403,
    )
    started = client.post(f"/rooms/{code}/start", json={"user_id": host["user_id"]}).json()
    check("host started room", started["status"] == "IN_PROGRESS")

    # survey
    payload = client.get(f"/rooms/{code}/survey").json()
    check("18 items served", payload["total"] == 18, payload["total"])

    leaked = [k for item in payload["items"] for k in item if k not in {"id", "text", "choices"}]
    check("axis ids not leaked to client", not leaked, leaked)
    leaked_values = [
        k
        for item in payload["items"]
        for choice in item["choices"]
        for k in choice
        if k not in {"key", "text"}
    ]
    check("choice values not leaked", not leaked_values, leaked_values)

    three = [i for i in payload["items"] if len(i["choices"]) == 3]
    check("three-choice item present", len(three) == 1, [i["id"] for i in three])

    items = items_for("TP")
    state = client.get(f"/rooms/{code}/survey/state").json()
    check("nobody submitted yet", state["submitted"] == 0 and not state["revealed"], state)

    result = client.post(
        f"/rooms/{code}/survey",
        json={"user_id": host["user_id"], "answers": answers_picking(items, +1)},
    ).json()
    check("host submission complete", result["complete"] is True, result)

    state = client.get(f"/rooms/{code}/survey/state").json()
    check("one of two submitted", state == {"submitted": 1, "total": 2, "revealed": False}, state)

    client.post(
        f"/rooms/{code}/survey",
        json={"user_id": guest["user_id"], "answers": answers_picking(items, -1)},
    )
    state = client.get(f"/rooms/{code}/survey/state").json()
    check("reveal flips when everyone is done", state["revealed"] is True, state)

    # scoring
    db = database.SessionLocal()
    rows = db.query(AxisScore).filter(AxisScore.user_id == host["user_id"]).all()
    check("9 SELF axes written", len(rows) == 9, len(rows))
    check("all rows carry category", all(r.category == "TP" for r in rows))
    check("all rows are SELF", all(r.source == "SELF" for r in rows))
    check("max-positive answers score 5.0", all(abs(r.value - 5.0) < 1e-6 for r in rows))
    low = db.query(AxisScore).filter(AxisScore.user_id == guest["user_id"]).all()
    check("min answers score 0.0", all(abs(r.value) < 1e-6 for r in low))
    db.close()

    mixed = answers_picking(items, +1)
    mixed["DOM-2"] = "A"  # A on the reverse-keyed item is the low end
    client.post(f"/rooms/{code}/survey", json={"user_id": host["user_id"], "answers": mixed})
    db = database.SessionLocal()
    dom = db.get(AxisScore, (host["user_id"], "TP", "DOM", "SELF", room["id"]))
    check("contradictory pair pinned to midpoint", abs(dom.value - 2.5) < 1e-6, dom.value)
    db.close()

    # report
    report = client.get(f"/rooms/{code}/report/{host['user_id']}").json()
    check("report keyed by user_id resolves nickname", report["name"] == "종훈", report["name"])

    print()
    if failures:
        print(f"{len(failures)} FAILED: {failures}")
        return 1
    print("all checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
