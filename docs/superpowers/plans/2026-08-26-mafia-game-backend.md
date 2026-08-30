# Mafia Game Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend game logic for the persona-based mafia mini-game — persona-to-role assignment algorithm, day/night state machine, and an in-memory FastAPI layer — with a mock persona data provider that can be swapped for a real one without touching game logic.

**Architecture:** Pure-Python domain layer (`mafia_game/persona`, `mafia_game/roles`, `mafia_game/game`) with no framework dependencies, tested in isolation. A thin FastAPI layer (`mafia_game/api`) wraps the domain layer with an in-memory room store (no database — this run's explicit scope decision). A `validation/simulate.py` script drives the assignment algorithm across many mock-persona trials to validate its behavior before real persona data exists.

**Tech Stack:** Python 3.11+, FastAPI, Pydantic v2, pytest, httpx (for FastAPI TestClient), uvicorn (dev server).

**Spec:** `docs/mafia_game_design.md` (copied into this project from the original design doc)

## Global Constraints

- Persona axes: `initiative`, `analysis`, `empathy`, `caution`, each an integer 0–100 (spec §2.3).
- Missing axis defaults to neutral value 50; out-of-range values clamp to [0, 100] (spec §2.4).
- Role capacity by player count (spec §3.4): 4 → mafia 1 / police 1 / doctor 1 / citizen 1. 5 → mafia 1 / police 1 / doctor 1 / citizen 2. 6 → mafia 2 / police 1 / doctor 1 / citizen 2.
- Role weight formulas (spec §3.2): `mafia = 0.40*initiative + 0.35*(100-empathy) + 0.25*caution`; `police = 0.60*analysis + 0.40*caution`; `doctor = 0.65*empathy + 0.35*caution`; `citizen = 50` (fixed baseline, no formula).
- Assignment algorithm (spec §3.5): pool every player's top-3 (role, score) candidates, sort all candidates by score descending (ties broken by preference rank ascending), greedily assign while capacity remains.
- Fallback (spec §3.6): after greedy assignment, any unfilled capacity is force-filled from still-unassigned players — for `mafia` specifically, prefer the lowest-`empathy` unassigned player (tie → random); for every other role, pick uniformly at random. Fallback assignments are tagged `assigned_by="fallback_random"` vs. `"preference"` for greedy picks.
- Win conditions (spec §4.3): 0 mafia alive → citizen team wins; alive mafia count ≥ alive non-mafia count → mafia wins.
- This run's scope decisions (from user clarification, not in the original spec): backend + game logic only, no frontend; **no database — in-memory state only**; no real-time timers — phase advancement (`DAY_DISCUSSION → DAY_VOTE`, etc.) is triggered by an explicit `/advance` API call instead of a timer, since there is no persistence layer to recover a timer from anyway.
- Tie-break simplification (not specified in the original spec, decided here for a concrete, implementable rule): day-vote ties and night-kill-target ties both resolve via uniform random choice among the tied targets.
- Out of scope for this plan (per the same scope decision): spec §6's icebreaking result-briefing UI (narrative text generation, superlatives, share cards) is not implemented here. This plan does expose the data it would need — each player's `role`, `assigned_score`, and `assigned_by` via `GET /rooms/{room_id}/result` — so that layer can be built on top later without backend changes.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `requirements.txt`
- Create: `pyproject.toml`
- Create: `README.md`
- Create: `mafia_game/__init__.py`
- Create: `mafia_game/persona/__init__.py`
- Create: `mafia_game/roles/__init__.py`
- Create: `mafia_game/game/__init__.py`
- Create: `mafia_game/api/__init__.py`
- Create: `mafia_game/validation/__init__.py`
- Create: `tests/__init__.py`

**Interfaces:**
- Produces: an importable `mafia_game` package tree, and a working `pytest` command run from the project root.

- [ ] **Step 1: Create the package skeleton and config files**

`requirements.txt`:
```
fastapi==0.115.0
uvicorn==0.32.0
pydantic==2.9.2
pytest==8.3.3
httpx==0.27.2
```

`pyproject.toml`:
```toml
[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

`mafia_game/__init__.py`, `mafia_game/persona/__init__.py`, `mafia_game/roles/__init__.py`, `mafia_game/game/__init__.py`, `mafia_game/api/__init__.py`, `mafia_game/validation/__init__.py`, `tests/__init__.py`: all empty files.

`README.md`:
```markdown
# Mafia Game Backend (miniproject)

Persona 성향 데이터 기반 마피아 게임의 게임 로직 + API. 설계 문서는
`docs/mafia_game_design.md` 참고. 구현 계획은
`docs/superpowers/plans/2026-08-26-mafia-game-backend.md` 참고.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

## Test

```bash
pytest
```

## Run the API

```bash
uvicorn mafia_game.api.app:app --reload
```

## Run the assignment-algorithm validation (mock persona data)

```bash
python -m mafia_game.validation.simulate
```

## 실제 페르소나 데이터 연동 시

두 지점만 실제 데이터로 교체하면 된다. 게임 로직/API 코드는 수정할 필요가 없다.

1. **API 경로**: 외부 성향 데이터 팀이 `POST /rooms/{room_id}/persona`에
   `docs/mafia_game_design.md` §2.2 스키마 그대로 JSON을 보내면 끝. 이
   엔드포인트는 데이터가 목업인지 실제인지 구분하지 않는다.
2. **라이브러리 경로**: `mafia_game/persona/provider.py`의 `PersonaProvider`
   추상 클래스를 구현하는 `RealPersonaProvider`를 새로 만들고
   (`MockPersonaProvider`와 동일하게 `get_personas(player_ids) -> dict[str, PersonaScores]`
   시그니처만 지키면 됨), `validation/simulate.py`나 향후 배치
   스크립트에서 `MockPersonaProvider()` 대신 주입하면 된다.
```

- [ ] **Step 2: Initialize git and verify pytest runs**

Run: `git init && git add -A && git commit -m "chore: scaffold mafia game backend project"`
Run: `pytest`
Expected: `pytest` reports "no tests ran" (no test files exist yet) with exit code 0 — this confirms the package is importable and pytest config is correct before any real code exists.

---

## Task 2: Persona Score Schema

**Files:**
- Create: `mafia_game/persona/schema.py`
- Test: `tests/test_persona_schema.py`

**Interfaces:**
- Produces: `PERSONA_AXES: tuple[str, ...]`, `NEUTRAL_SCORE: int`, `PersonaScores` (pydantic model with fields `initiative, analysis, empathy, caution: int`), `PersonaScores.from_partial(data: dict[str, int]) -> PersonaScores`.

- [ ] **Step 1: Write the failing tests**

`tests/test_persona_schema.py`:
```python
from mafia_game.persona.schema import PersonaScores, PERSONA_AXES, NEUTRAL_SCORE


def test_persona_axes_are_the_four_spec_axes():
    assert set(PERSONA_AXES) == {"initiative", "analysis", "empathy", "caution"}


def test_valid_scores_pass_through_unchanged():
    p = PersonaScores(initiative=82, analysis=65, empathy=40, caution=55)
    assert p.initiative == 82
    assert p.analysis == 65
    assert p.empathy == 40
    assert p.caution == 55


def test_out_of_range_scores_clamp_to_0_100():
    p = PersonaScores(initiative=150, analysis=-20, empathy=0, caution=100)
    assert p.initiative == 100
    assert p.analysis == 0
    assert p.empathy == 0
    assert p.caution == 100


def test_from_partial_fills_missing_axis_with_neutral_score():
    p = PersonaScores.from_partial({"initiative": 82, "analysis": 65, "caution": 55})
    assert p.empathy == NEUTRAL_SCORE
    assert p.initiative == 82


def test_from_partial_with_empty_dict_gives_all_neutral_scores():
    p = PersonaScores.from_partial({})
    assert p.initiative == p.analysis == p.empathy == p.caution == NEUTRAL_SCORE
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_persona_schema.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.persona.schema'`

- [ ] **Step 3: Implement the schema**

`mafia_game/persona/schema.py`:
```python
from pydantic import BaseModel, field_validator

PERSONA_AXES: tuple[str, ...] = ("initiative", "analysis", "empathy", "caution")
NEUTRAL_SCORE = 50


class PersonaScores(BaseModel):
    initiative: int
    analysis: int
    empathy: int
    caution: int

    @field_validator("initiative", "analysis", "empathy", "caution")
    @classmethod
    def clamp_to_valid_range(cls, value: int) -> int:
        return max(0, min(100, value))

    @classmethod
    def from_partial(cls, data: dict[str, int]) -> "PersonaScores":
        filled = {axis: data.get(axis, NEUTRAL_SCORE) for axis in PERSONA_AXES}
        return cls(**filled)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_persona_schema.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add mafia_game/persona/schema.py tests/test_persona_schema.py
git commit -m "feat: add PersonaScores schema with clamping and defaulting"
```

---

## Task 3: Persona Provider Interface + Mock Implementation

**Files:**
- Create: `mafia_game/persona/provider.py`
- Test: `tests/test_persona_provider.py`

**Interfaces:**
- Consumes: `PersonaScores`, `PERSONA_AXES` from `mafia_game.persona.schema` (Task 2).
- Produces: `PersonaProvider` (ABC with `get_personas(player_ids: list[str]) -> dict[str, PersonaScores]`), `MockPersonaProvider(PersonaProvider)`.

- [ ] **Step 1: Write the failing tests**

`tests/test_persona_provider.py`:
```python
from mafia_game.persona.provider import MockPersonaProvider
from mafia_game.persona.schema import PersonaScores, PERSONA_AXES


def test_mock_provider_returns_one_persona_per_player_id():
    provider = MockPersonaProvider(seed=1)
    result = provider.get_personas(["p1", "p2", "p3"])
    assert set(result.keys()) == {"p1", "p2", "p3"}
    for persona in result.values():
        assert isinstance(persona, PersonaScores)
        for axis in PERSONA_AXES:
            assert 0 <= getattr(persona, axis) <= 100


def test_mock_provider_is_deterministic_given_the_same_seed():
    a = MockPersonaProvider(seed=42).get_personas(["p1", "p2"])
    b = MockPersonaProvider(seed=42).get_personas(["p1", "p2"])
    assert a["p1"] == b["p1"]
    assert a["p2"] == b["p2"]


def test_mock_provider_varies_without_a_fixed_seed_across_instances():
    a = MockPersonaProvider(seed=1).get_personas(["p1"])
    b = MockPersonaProvider(seed=2).get_personas(["p1"])
    assert a["p1"] != b["p1"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_persona_provider.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.persona.provider'`

- [ ] **Step 3: Implement the provider interface and mock**

`mafia_game/persona/provider.py`:
```python
import random
from abc import ABC, abstractmethod

from mafia_game.persona.schema import PersonaScores, PERSONA_AXES


class PersonaProvider(ABC):
    """실제 성향 데이터 팀의 API를 감싸는 구현체(RealPersonaProvider)를
    같은 인터페이스로 추가하면, 이 인터페이스를 사용하는 코드는 전혀
    수정할 필요가 없다."""

    @abstractmethod
    def get_personas(self, player_ids: list[str]) -> dict[str, PersonaScores]:
        ...


class MockPersonaProvider(PersonaProvider):
    def __init__(self, seed: int | None = None) -> None:
        self._rng = random.Random(seed)

    def get_personas(self, player_ids: list[str]) -> dict[str, PersonaScores]:
        return {
            player_id: PersonaScores(
                **{axis: self._rng.randint(0, 100) for axis in PERSONA_AXES}
            )
            for player_id in player_ids
        }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_persona_provider.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add mafia_game/persona/provider.py tests/test_persona_provider.py
git commit -m "feat: add PersonaProvider interface with mock implementation"
```

---

## Task 4: Role Weight Computation

**Files:**
- Create: `mafia_game/roles/weights.py`
- Test: `tests/test_weights.py`

**Interfaces:**
- Consumes: `PersonaScores` from `mafia_game.persona.schema` (Task 2).
- Produces: `ROLES: tuple[str, ...]`, `compute_role_scores(persona: PersonaScores) -> dict[str, float]` (keys: `mafia`, `police`, `doctor`, `citizen`).

- [ ] **Step 1: Write the failing tests**

Uses the two example players from spec §2.2, with scores hand-computed from the §3.2 formulas.

`tests/test_weights.py`:
```python
import pytest

from mafia_game.persona.schema import PersonaScores
from mafia_game.roles.weights import compute_role_scores, ROLES


def test_roles_are_the_four_spec_roles():
    assert set(ROLES) == {"mafia", "police", "doctor", "citizen"}


def test_compute_role_scores_matches_spec_example_player_p01():
    # spec §2.2 p_01: initiative=82, analysis=65, empathy=40, caution=55
    p = PersonaScores(initiative=82, analysis=65, empathy=40, caution=55)
    scores = compute_role_scores(p)
    assert scores["mafia"] == pytest.approx(67.55)
    assert scores["police"] == pytest.approx(61.0)
    assert scores["doctor"] == pytest.approx(45.25)
    assert scores["citizen"] == pytest.approx(50.0)


def test_compute_role_scores_matches_spec_example_player_p02():
    # spec §2.2 p_02: initiative=35, analysis=90, empathy=58, caution=70
    p = PersonaScores(initiative=35, analysis=90, empathy=58, caution=70)
    scores = compute_role_scores(p)
    assert scores["mafia"] == pytest.approx(46.2)
    assert scores["police"] == pytest.approx(82.0)
    assert scores["doctor"] == pytest.approx(62.2)
    assert scores["citizen"] == pytest.approx(50.0)


def test_citizen_score_is_always_the_fixed_baseline():
    high = PersonaScores(initiative=100, analysis=100, empathy=100, caution=100)
    low = PersonaScores(initiative=0, analysis=0, empathy=0, caution=0)
    assert compute_role_scores(high)["citizen"] == 50.0
    assert compute_role_scores(low)["citizen"] == 50.0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_weights.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.roles.weights'`

- [ ] **Step 3: Implement weight computation**

`mafia_game/roles/weights.py`:
```python
from mafia_game.persona.schema import PersonaScores

ROLES: tuple[str, ...] = ("mafia", "police", "doctor", "citizen")

_MAFIA_WEIGHTS = {"initiative": 0.40, "empathy_inverse": 0.35, "caution": 0.25}
_POLICE_WEIGHTS = {"analysis": 0.60, "caution": 0.40}
_DOCTOR_WEIGHTS = {"empathy": 0.65, "caution": 0.35}
_CITIZEN_BASELINE = 50.0


def compute_role_scores(persona: PersonaScores) -> dict[str, float]:
    return {
        "mafia": (
            _MAFIA_WEIGHTS["initiative"] * persona.initiative
            + _MAFIA_WEIGHTS["empathy_inverse"] * (100 - persona.empathy)
            + _MAFIA_WEIGHTS["caution"] * persona.caution
        ),
        "police": (
            _POLICE_WEIGHTS["analysis"] * persona.analysis
            + _POLICE_WEIGHTS["caution"] * persona.caution
        ),
        "doctor": (
            _DOCTOR_WEIGHTS["empathy"] * persona.empathy
            + _DOCTOR_WEIGHTS["caution"] * persona.caution
        ),
        "citizen": _CITIZEN_BASELINE,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_weights.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add mafia_game/roles/weights.py tests/test_weights.py
git commit -m "feat: add persona-to-role weight computation"
```

---

## Task 5: Role Capacity Table

**Files:**
- Create: `mafia_game/roles/capacity.py`
- Test: `tests/test_capacity.py`

**Interfaces:**
- Produces: `get_role_capacity(player_count: int) -> dict[str, int]`.

- [ ] **Step 1: Write the failing tests**

`tests/test_capacity.py`:
```python
import pytest

from mafia_game.roles.capacity import get_role_capacity


def test_capacity_for_4_players():
    assert get_role_capacity(4) == {"mafia": 1, "police": 1, "doctor": 1, "citizen": 1}


def test_capacity_for_5_players():
    assert get_role_capacity(5) == {"mafia": 1, "police": 1, "doctor": 1, "citizen": 2}


def test_capacity_for_6_players():
    assert get_role_capacity(6) == {"mafia": 2, "police": 1, "doctor": 1, "citizen": 2}


def test_capacity_totals_match_player_count():
    for player_count in (4, 5, 6):
        assert sum(get_role_capacity(player_count).values()) == player_count


def test_unsupported_player_count_raises():
    with pytest.raises(ValueError):
        get_role_capacity(7)


def test_returned_dict_is_a_copy_not_shared_mutable_state():
    a = get_role_capacity(4)
    a["mafia"] = 99
    b = get_role_capacity(4)
    assert b["mafia"] == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_capacity.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.roles.capacity'`

- [ ] **Step 3: Implement the capacity table**

`mafia_game/roles/capacity.py`:
```python
_ROLE_CAPACITY: dict[int, dict[str, int]] = {
    4: {"mafia": 1, "police": 1, "doctor": 1, "citizen": 1},
    5: {"mafia": 1, "police": 1, "doctor": 1, "citizen": 2},
    6: {"mafia": 2, "police": 1, "doctor": 1, "citizen": 2},
}


def get_role_capacity(player_count: int) -> dict[str, int]:
    if player_count not in _ROLE_CAPACITY:
        raise ValueError(
            f"Unsupported player_count: {player_count}. Supported: 4, 5, 6"
        )
    return dict(_ROLE_CAPACITY[player_count])
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_capacity.py -v`
Expected: PASS (6 passed)

- [ ] **Step 5: Commit**

```bash
git add mafia_game/roles/capacity.py tests/test_capacity.py
git commit -m "feat: add role capacity table for 4/5/6 players"
```

---

## Task 6: Role Assignment — Ranking and Greedy Matching

**Files:**
- Create: `mafia_game/roles/assignment.py`
- Test: `tests/test_assignment.py`

**Interfaces:**
- Consumes: `PersonaScores` (Task 2), `compute_role_scores` (Task 4).
- Produces: `RoleAssignment` (dataclass: `player_id: str, role: str, score: float, assigned_by: str`), `rank_top3(role_scores: dict[str, float]) -> list[tuple[str, float]]`, `assign_roles(players: dict[str, PersonaScores], role_capacity: dict[str, int], rng: random.Random | None = None) -> dict[str, RoleAssignment]`.

- [ ] **Step 1: Write the failing tests**

`tests/test_assignment.py`:
```python
import pytest

from mafia_game.persona.schema import PersonaScores
from mafia_game.roles.assignment import assign_roles, rank_top3
from mafia_game.roles.weights import compute_role_scores


def test_rank_top3_orders_by_score_descending_and_caps_at_three():
    scores = {"mafia": 10.0, "police": 90.0, "doctor": 50.0, "citizen": 50.0}
    top3 = rank_top3(scores)
    assert len(top3) == 3
    assert [role for role, _ in top3] == ["police", "doctor", "citizen"]


def test_assign_roles_gives_each_player_their_top_choice_when_no_conflict():
    # spec §2.2 examples: p_01's top choice is mafia, p_02's top choice is police
    players = {
        "p_01": PersonaScores(initiative=82, analysis=65, empathy=40, caution=55),
        "p_02": PersonaScores(initiative=35, analysis=90, empathy=58, caution=70),
    }
    capacity = {"mafia": 1, "police": 1, "doctor": 0, "citizen": 0}
    result = assign_roles(players, capacity)
    assert result["p_01"].role == "mafia"
    assert result["p_01"].assigned_by == "preference"
    assert result["p_02"].role == "police"
    assert result["p_02"].assigned_by == "preference"


def test_assign_roles_bumps_loser_to_second_choice_on_capacity_conflict():
    # Both players' top choice is police, second choice is doctor.
    # A's police score (100) beats B's (90), so B must fall back to doctor.
    player_a = PersonaScores(initiative=50, analysis=100, empathy=50, caution=100)
    player_b = PersonaScores(initiative=50, analysis=90, empathy=50, caution=90)
    assert rank_top3(compute_role_scores(player_a))[0][0] == "police"
    assert rank_top3(compute_role_scores(player_b))[0][0] == "police"

    capacity = {"mafia": 0, "police": 1, "doctor": 1, "citizen": 0}
    result = assign_roles({"a": player_a, "b": player_b}, capacity)
    assert result["a"].role == "police"
    assert result["b"].role == "doctor"
    assert result["a"].assigned_by == "preference"
    assert result["b"].assigned_by == "preference"


def test_assign_roles_never_exceeds_role_capacity():
    players = {
        f"p{i}": PersonaScores(initiative=i * 10 % 100, analysis=(i * 7) % 100,
                                empathy=(i * 13) % 100, caution=(i * 3) % 100)
        for i in range(6)
    }
    capacity = {"mafia": 2, "police": 1, "doctor": 1, "citizen": 2}
    result = assign_roles(players, capacity)
    assert len(result) == 6
    counts = {}
    for assignment in result.values():
        counts[assignment.role] = counts.get(assignment.role, 0) + 1
    assert counts == capacity
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_assignment.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.roles.assignment'`

- [ ] **Step 3: Implement ranking and greedy assignment**

`mafia_game/roles/assignment.py`:
```python
import random
from dataclasses import dataclass

from mafia_game.persona.schema import PersonaScores
from mafia_game.roles.weights import compute_role_scores


@dataclass
class RoleAssignment:
    player_id: str
    role: str
    score: float
    assigned_by: str  # "preference" | "fallback_random"


def rank_top3(role_scores: dict[str, float]) -> list[tuple[str, float]]:
    return sorted(role_scores.items(), key=lambda kv: kv[1], reverse=True)[:3]


def assign_roles(
    players: dict[str, PersonaScores],
    role_capacity: dict[str, int],
    rng: random.Random | None = None,
) -> dict[str, RoleAssignment]:
    rng = rng or random.Random()

    candidates: list[tuple[float, int, str, str]] = []  # (score, rank, player_id, role)
    for player_id, persona in players.items():
        scores = compute_role_scores(persona)
        for rank, (role, score) in enumerate(rank_top3(scores), start=1):
            candidates.append((score, rank, player_id, role))
    candidates.sort(key=lambda c: (-c[0], c[1]))

    remaining = dict(role_capacity)
    assigned: dict[str, RoleAssignment] = {}

    for score, _rank, player_id, role in candidates:
        if player_id in assigned:
            continue
        if remaining.get(role, 0) <= 0:
            continue
        assigned[player_id] = RoleAssignment(player_id, role, score, "preference")
        remaining[role] -= 1

    fill_remaining_with_fallback(players, assigned, remaining, rng)
    return assigned


def fill_remaining_with_fallback(
    players: dict[str, PersonaScores],
    assigned: dict[str, RoleAssignment],
    remaining: dict[str, int],
    rng: random.Random,
) -> None:
    """정원이 남았는데 후보가 없는 경우 미배정 플레이어 중 강제 지정한다
    (spec §3.6). mafia는 공감력이 가장 낮은 사람을 우선한다."""
    unassigned = [pid for pid in players if pid not in assigned]

    for role, count in list(remaining.items()):
        while count > 0 and unassigned:
            if role == "mafia":
                pick = min(unassigned, key=lambda pid: (players[pid].empathy, rng.random()))
            else:
                pick = rng.choice(unassigned)
            role_score = compute_role_scores(players[pick])[role]
            assigned[pick] = RoleAssignment(pick, role, role_score, "fallback_random")
            unassigned.remove(pick)
            count -= 1
        remaining[role] = count
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_assignment.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add mafia_game/roles/assignment.py tests/test_assignment.py
git commit -m "feat: add greedy role assignment with preference ranking"
```

---

## Task 7: Role Assignment — Fallback Exception Handling

**Files:**
- Modify: none (implementation already added in Task 6)
- Test: `tests/test_assignment_fallback.py`

**Interfaces:**
- Consumes: `assign_roles`, `fill_remaining_with_fallback`, `RoleAssignment` from `mafia_game.roles.assignment` (Task 6).

This task adds the fallback-specific test coverage the design doc calls out as its own requirement (spec §3.6): the "nobody is suited to be mafia" exception, and the empathy tie-break rule, tested in isolation from the greedy-preference phase.

- [ ] **Step 1: Write the failing tests**

`tests/test_assignment_fallback.py`:
```python
import random

from mafia_game.persona.schema import PersonaScores
from mafia_game.roles.assignment import assign_roles, fill_remaining_with_fallback, RoleAssignment


def test_fallback_prefers_lowest_empathy_for_mafia():
    players = {
        "a": PersonaScores(initiative=50, analysis=50, empathy=90, caution=50),
        "b": PersonaScores(initiative=50, analysis=50, empathy=50, caution=50),
        "c": PersonaScores(initiative=50, analysis=50, empathy=70, caution=50),
    }
    assigned: dict[str, RoleAssignment] = {}
    remaining = {"mafia": 1}

    fill_remaining_with_fallback(players, assigned, remaining, random.Random(0))

    assert assigned["b"].role == "mafia"
    assert assigned["b"].assigned_by == "fallback_random"
    assert "a" not in assigned
    assert "c" not in assigned
    assert remaining["mafia"] == 0


def test_fallback_fills_non_mafia_roles_randomly():
    players = {
        "a": PersonaScores(initiative=50, analysis=50, empathy=50, caution=50),
        "b": PersonaScores(initiative=50, analysis=50, empathy=50, caution=50),
    }
    assigned: dict[str, RoleAssignment] = {}
    remaining = {"citizen": 2}

    fill_remaining_with_fallback(players, assigned, remaining, random.Random(0))

    assert assigned["a"].role == "citizen"
    assert assigned["b"].role == "citizen"
    assert assigned["a"].assigned_by == "fallback_random"
    assert assigned["b"].assigned_by == "fallback_random"


def test_assign_roles_triggers_mafia_fallback_when_nobody_prefers_it():
    # Low initiative/caution + high empathy pushes every player's mafia
    # score below doctor/citizen/police, so mafia never appears in anyone's
    # top-3 preference and must be force-filled (spec §3.6 exception).
    players = {
        "p1": PersonaScores(initiative=10, analysis=50, empathy=95, caution=10),
        "p2": PersonaScores(initiative=10, analysis=50, empathy=85, caution=10),
        "p3": PersonaScores(initiative=10, analysis=50, empathy=75, caution=10),
    }
    capacity = {"mafia": 1, "doctor": 1, "citizen": 1, "police": 0}

    result = assign_roles(players, capacity, rng=random.Random(0))

    assert len(result) == 3
    counts = {}
    for assignment in result.values():
        counts[assignment.role] = counts.get(assignment.role, 0) + 1
    assert counts == {"mafia": 1, "doctor": 1, "citizen": 1}
    mafia_assignment = next(a for a in result.values() if a.role == "mafia")
    assert mafia_assignment.assigned_by == "fallback_random"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_assignment_fallback.py -v`
Expected: FAIL — `fill_remaining_with_fallback` doesn't yet exist as an importable symbol if Task 6 hasn't landed the public rename; if Task 6's implementation already matches Task 6 Step 3 above, this instead FAILs on assertion because the function isn't used correctly. Confirm the failure is a real assertion/behavior failure, not an import error, before proceeding.

- [ ] **Step 3: No new implementation needed**

Task 6's `fill_remaining_with_fallback` and `assign_roles` already implement this behavior. If any test in Step 2 fails on behavior (not import), fix `mafia_game/roles/assignment.py` to match — the most likely gap is the empathy tie-break key `(players[pid].empathy, rng.random())` in `fill_remaining_with_fallback`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_assignment_fallback.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add tests/test_assignment_fallback.py
git commit -m "test: cover mafia-fallback exception handling from spec §3.6"
```

---

## Task 8: Game State Models

**Files:**
- Create: `mafia_game/game/state.py`
- Test: `tests/test_game_state.py`

**Interfaces:**
- Consumes: `PersonaScores` from `mafia_game.persona.schema` (Task 2).
- Produces: `GamePhase` (str Enum: `WAITING_ROOM, ROLE_ASSIGNMENT, DAY_DISCUSSION, DAY_VOTE, NIGHT_ACTION, RESULT`), `Player` (dataclass), `Room` (dataclass).

- [ ] **Step 1: Write the failing tests**

`tests/test_game_state.py`:
```python
from mafia_game.game.state import GamePhase, Player, Room


def test_room_starts_in_waiting_room_phase_with_no_players():
    room = Room(room_id="r1", player_count=4)
    assert room.phase == GamePhase.WAITING_ROOM
    assert room.players == {}
    assert room.day_number == 0
    assert room.night_number == 0
    assert room.winner is None
    assert room.host_player_id is None


def test_player_starts_alive_with_no_role():
    player = Player(player_id="p1", nickname="정글짐")
    assert player.is_alive is True
    assert player.role is None
    assert player.assigned_score is None
    assert player.assigned_by is None


def test_room_can_hold_players_and_personas_independently():
    room = Room(room_id="r1", player_count=4)
    room.players["p1"] = Player(player_id="p1", nickname="정글짐")
    assert "p1" in room.players
    assert room.personas == {}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_game_state.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.game.state'`

- [ ] **Step 3: Implement state models**

`mafia_game/game/state.py`:
```python
from dataclasses import dataclass, field
from enum import Enum

from mafia_game.persona.schema import PersonaScores


class GamePhase(str, Enum):
    WAITING_ROOM = "WAITING_ROOM"
    ROLE_ASSIGNMENT = "ROLE_ASSIGNMENT"
    DAY_DISCUSSION = "DAY_DISCUSSION"
    DAY_VOTE = "DAY_VOTE"
    NIGHT_ACTION = "NIGHT_ACTION"
    RESULT = "RESULT"


@dataclass
class Player:
    player_id: str
    nickname: str
    is_alive: bool = True
    role: str | None = None
    assigned_score: float | None = None
    assigned_by: str | None = None


@dataclass
class Room:
    room_id: str
    player_count: int
    players: dict[str, Player] = field(default_factory=dict)
    personas: dict[str, PersonaScores] = field(default_factory=dict)
    phase: GamePhase = GamePhase.WAITING_ROOM
    day_number: int = 0
    night_number: int = 0
    votes: dict[str, str] = field(default_factory=dict)
    night_actions: dict[str, tuple[str, str]] = field(default_factory=dict)
    investigation_result: dict | None = None
    winner: str | None = None
    host_player_id: str | None = None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_game_state.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add mafia_game/game/state.py tests/test_game_state.py
git commit -m "feat: add Room/Player/GamePhase state models"
```

---

## Task 9: Win Condition Check

**Files:**
- Create: `mafia_game/game/win_conditions.py`
- Test: `tests/test_win_conditions.py`

**Interfaces:**
- Consumes: `Room`, `Player` from `mafia_game.game.state` (Task 8).
- Produces: `check_win_condition(room: Room) -> str | None` (returns `"mafia"`, `"citizen"`, or `None`).

- [ ] **Step 1: Write the failing tests**

`tests/test_win_conditions.py`:
```python
from mafia_game.game.state import Room, Player
from mafia_game.game.win_conditions import check_win_condition


def _room_with(roles_alive: list[str], roles_dead: list[str] = ()) -> Room:
    room = Room(room_id="r1", player_count=len(roles_alive) + len(roles_dead))
    for i, role in enumerate(roles_alive):
        pid = f"alive_{i}"
        room.players[pid] = Player(player_id=pid, nickname=pid, role=role, is_alive=True)
    for i, role in enumerate(roles_dead):
        pid = f"dead_{i}"
        room.players[pid] = Player(player_id=pid, nickname=pid, role=role, is_alive=False)
    return room


def test_citizen_team_wins_when_no_mafia_alive():
    room = _room_with(["police", "doctor", "citizen"], roles_dead=["mafia"])
    assert check_win_condition(room) == "citizen"


def test_mafia_wins_when_mafia_count_equals_others_count():
    room = _room_with(["mafia", "citizen"])
    assert check_win_condition(room) == "mafia"


def test_mafia_wins_when_mafia_outnumbers_others():
    room = _room_with(["mafia", "mafia", "citizen"])
    assert check_win_condition(room) == "mafia"


def test_no_winner_when_mafia_is_outnumbered():
    room = _room_with(["mafia", "police", "doctor", "citizen"])
    assert check_win_condition(room) is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_win_conditions.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.game.win_conditions'`

- [ ] **Step 3: Implement win condition check**

`mafia_game/game/win_conditions.py`:
```python
from mafia_game.game.state import Room


def check_win_condition(room: Room) -> str | None:
    alive = [p for p in room.players.values() if p.is_alive]
    mafia_alive = sum(1 for p in alive if p.role == "mafia")
    others_alive = len(alive) - mafia_alive

    if mafia_alive == 0:
        return "citizen"
    if mafia_alive >= others_alive:
        return "mafia"
    return None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_win_conditions.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add mafia_game/game/win_conditions.py tests/test_win_conditions.py
git commit -m "feat: add win condition check"
```

---

## Task 10: Vote Tallying

**Files:**
- Create: `mafia_game/game/votes.py`
- Test: `tests/test_votes.py`

**Interfaces:**
- Consumes: `Room` from `mafia_game.game.state` (Task 8).
- Produces: `tally_votes(room: Room, rng: random.Random | None = None) -> str | None`.

- [ ] **Step 1: Write the failing tests**

`tests/test_votes.py`:
```python
import random

from mafia_game.game.state import Room
from mafia_game.game.votes import tally_votes


def test_tally_votes_returns_none_when_no_votes_cast():
    room = Room(room_id="r1", player_count=4)
    assert tally_votes(room) is None


def test_tally_votes_returns_clear_majority_target():
    room = Room(room_id="r1", player_count=4)
    room.votes = {"a": "x", "b": "x", "c": "y"}
    assert tally_votes(room) == "x"


def test_tally_votes_breaks_ties_randomly_among_tied_targets():
    room = Room(room_id="r1", player_count=4)
    room.votes = {"a": "x", "b": "y"}
    result = tally_votes(room, rng=random.Random(0))
    assert result in {"x", "y"}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_votes.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.game.votes'`

- [ ] **Step 3: Implement vote tallying**

`mafia_game/game/votes.py`:
```python
import random
from collections import Counter

from mafia_game.game.state import Room


def tally_votes(room: Room, rng: random.Random | None = None) -> str | None:
    if not room.votes:
        return None
    rng = rng or random.Random()
    counts = Counter(room.votes.values())
    max_count = max(counts.values())
    tied = [target for target, count in counts.items() if count == max_count]
    return rng.choice(tied)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_votes.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add mafia_game/game/votes.py tests/test_votes.py
git commit -m "feat: add day-vote tallying with random tie-break"
```

---

## Task 11: Night Action Resolution

**Files:**
- Create: `mafia_game/game/night_actions.py`
- Test: `tests/test_night_actions.py`

**Interfaces:**
- Consumes: `Room`, `Player` from `mafia_game.game.state` (Task 8).
- Produces: `resolve_night_actions(room: Room, rng: random.Random | None = None) -> str | None` (returns the killed player's id, or `None`; also sets `room.investigation_result` and flips the killed player's `is_alive`).

- [ ] **Step 1: Write the failing tests**

`tests/test_night_actions.py`:
```python
import random

from mafia_game.game.state import Room, Player
from mafia_game.game.night_actions import resolve_night_actions


def _room_with_players(*ids: str) -> Room:
    room = Room(room_id="r1", player_count=len(ids))
    for pid in ids:
        room.players[pid] = Player(player_id=pid, nickname=pid)
    return room


def test_mafia_kill_without_protection_kills_target():
    room = _room_with_players("mafia1", "victim")
    room.night_actions = {"mafia1": ("kill", "victim")}

    killed = resolve_night_actions(room)

    assert killed == "victim"
    assert room.players["victim"].is_alive is False


def test_doctor_protection_saves_the_kill_target():
    room = _room_with_players("mafia1", "doctor1", "victim")
    room.night_actions = {
        "mafia1": ("kill", "victim"),
        "doctor1": ("protect", "victim"),
    }

    killed = resolve_night_actions(room)

    assert killed is None
    assert room.players["victim"].is_alive is True


def test_police_investigation_reports_whether_target_is_mafia():
    room = _room_with_players("police1", "mafia1")
    room.players["mafia1"].role = "mafia"
    room.night_actions = {"police1": ("investigate", "mafia1")}

    resolve_night_actions(room)

    assert room.investigation_result == {
        "police_id": "police1",
        "target_id": "mafia1",
        "is_mafia": True,
    }


def test_no_night_actions_kills_nobody():
    room = _room_with_players("a", "b")
    killed = resolve_night_actions(room)
    assert killed is None
    assert room.players["a"].is_alive is True
    assert room.players["b"].is_alive is True


def test_multiple_mafia_kill_votes_break_ties_randomly():
    room = _room_with_players("mafia1", "mafia2", "x", "y")
    room.night_actions = {"mafia1": ("kill", "x"), "mafia2": ("kill", "y")}

    killed = resolve_night_actions(room, rng=random.Random(0))

    assert killed in {"x", "y"}
    assert room.players[killed].is_alive is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_night_actions.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.game.night_actions'`

- [ ] **Step 3: Implement night action resolution**

`mafia_game/game/night_actions.py`:
```python
import random

from mafia_game.game.state import Room


def resolve_night_actions(room: Room, rng: random.Random | None = None) -> str | None:
    rng = rng or random.Random()

    protect_target: str | None = None
    kill_targets: list[str] = []
    investigate: tuple[str, str] | None = None

    for actor_id, (action_type, target_id) in room.night_actions.items():
        if action_type == "protect":
            protect_target = target_id
        elif action_type == "kill":
            kill_targets.append(target_id)
        elif action_type == "investigate":
            investigate = (actor_id, target_id)

    killed: str | None = None
    if kill_targets:
        counts: dict[str, int] = {}
        for target in kill_targets:
            counts[target] = counts.get(target, 0) + 1
        max_count = max(counts.values())
        tied = [target for target, count in counts.items() if count == max_count]
        final_target = rng.choice(tied)
        if final_target != protect_target:
            killed = final_target
            room.players[killed].is_alive = False

    room.investigation_result = None
    if investigate is not None:
        police_id, target_id = investigate
        room.investigation_result = {
            "police_id": police_id,
            "target_id": target_id,
            "is_mafia": room.players[target_id].role == "mafia",
        }

    return killed
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_night_actions.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add mafia_game/game/night_actions.py tests/test_night_actions.py
git commit -m "feat: add night action resolution (kill/protect/investigate)"
```

---

## Task 12: Game State Machine

**Files:**
- Create: `mafia_game/game/state_machine.py`
- Test: `tests/test_state_machine.py`

**Interfaces:**
- Consumes: `Room, Player, GamePhase` (Task 8), `assign_roles` (Task 6), `get_role_capacity` (Task 5), `tally_votes` (Task 10), `resolve_night_actions` (Task 11), `check_win_condition` (Task 9), `PersonaScores` (Task 2).
- Produces: `InvalidPhaseTransition(Exception)`, `start_game(room, personas, rng=None)`, `begin_discussion(room)`, `open_vote(room)`, `resolve_day(room, rng=None)`, `resolve_night(room, rng=None)`.

- [ ] **Step 1: Write the failing tests**

`tests/test_state_machine.py`:
```python
import random

import pytest

from mafia_game.game.state import Room, Player, GamePhase
from mafia_game.game.state_machine import (
    start_game,
    begin_discussion,
    open_vote,
    resolve_day,
    resolve_night,
    InvalidPhaseTransition,
)
from mafia_game.persona.provider import MockPersonaProvider


def _new_room(player_count: int) -> Room:
    room = Room(room_id="r1", player_count=player_count)
    for i in range(player_count):
        pid = f"p{i}"
        room.players[pid] = Player(player_id=pid, nickname=pid)
    return room


def test_start_game_assigns_roles_and_moves_to_role_assignment_phase():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))

    start_game(room, personas, rng=random.Random(1))

    assert room.phase == GamePhase.ROLE_ASSIGNMENT
    roles = [p.role for p in room.players.values()]
    assert sorted(roles) == ["citizen", "doctor", "mafia", "police"]
    for player in room.players.values():
        assert player.assigned_score is not None
        assert player.assigned_by in {"preference", "fallback_random"}


def test_start_game_rejects_wrong_phase():
    room = _new_room(4)
    room.phase = GamePhase.DAY_DISCUSSION
    with pytest.raises(InvalidPhaseTransition):
        start_game(room, {})


def test_full_happy_path_reaches_result_with_a_winner():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=7).get_personas(list(room.players))
    rng = random.Random(7)

    start_game(room, personas, rng=rng)
    begin_discussion(room)
    assert room.phase == GamePhase.DAY_DISCUSSION
    assert room.day_number == 1

    open_vote(room)
    assert room.phase == GamePhase.DAY_VOTE

    non_mafia = next(p for p in room.players.values() if p.role != "mafia")
    for voter_id in room.players:
        room.votes[voter_id] = non_mafia.player_id
    resolve_day(room, rng=rng)

    assert room.phase in (GamePhase.NIGHT_ACTION, GamePhase.RESULT)
    if room.phase == GamePhase.NIGHT_ACTION:
        mafia = next(p for p in room.players.values() if p.role == "mafia" and p.is_alive)
        target = next(p for p in room.players.values() if p.is_alive and p.role != "mafia")
        room.night_actions[mafia.player_id] = ("kill", target.player_id)
        resolve_night(room, rng=rng)

    assert room.phase == GamePhase.RESULT
    assert room.winner in {"mafia", "citizen"}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_state_machine.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.game.state_machine'`

- [ ] **Step 3: Implement the state machine**

`mafia_game/game/state_machine.py`:
```python
import random

from mafia_game.game.night_actions import resolve_night_actions
from mafia_game.game.state import GamePhase, Room
from mafia_game.game.votes import tally_votes
from mafia_game.game.win_conditions import check_win_condition
from mafia_game.persona.schema import PersonaScores
from mafia_game.roles.assignment import assign_roles
from mafia_game.roles.capacity import get_role_capacity


class InvalidPhaseTransition(Exception):
    pass


def start_game(
    room: Room,
    personas: dict[str, PersonaScores],
    rng: random.Random | None = None,
) -> None:
    if room.phase != GamePhase.WAITING_ROOM:
        raise InvalidPhaseTransition(f"start_game requires WAITING_ROOM, got {room.phase}")

    capacity = get_role_capacity(room.player_count)
    assignments = assign_roles(personas, capacity, rng)
    for player_id, assignment in assignments.items():
        player = room.players[player_id]
        player.role = assignment.role
        player.assigned_score = assignment.score
        player.assigned_by = assignment.assigned_by

    room.personas = personas
    room.phase = GamePhase.ROLE_ASSIGNMENT


def begin_discussion(room: Room) -> None:
    if room.phase != GamePhase.ROLE_ASSIGNMENT:
        raise InvalidPhaseTransition(f"begin_discussion requires ROLE_ASSIGNMENT, got {room.phase}")
    room.day_number = 1
    room.phase = GamePhase.DAY_DISCUSSION


def open_vote(room: Room) -> None:
    if room.phase != GamePhase.DAY_DISCUSSION:
        raise InvalidPhaseTransition(f"open_vote requires DAY_DISCUSSION, got {room.phase}")
    room.phase = GamePhase.DAY_VOTE


def resolve_day(room: Room, rng: random.Random | None = None) -> None:
    if room.phase != GamePhase.DAY_VOTE:
        raise InvalidPhaseTransition(f"resolve_day requires DAY_VOTE, got {room.phase}")

    eliminated = tally_votes(room, rng)
    if eliminated:
        room.players[eliminated].is_alive = False
    room.votes = {}

    # WIN_CHECK(spec 상태도) is evaluated synchronously here rather than
    # persisted as its own phase, since nothing external needs to observe it.
    winner = check_win_condition(room)
    if winner:
        room.winner = winner
        room.phase = GamePhase.RESULT
    else:
        room.night_number += 1
        room.phase = GamePhase.NIGHT_ACTION


def resolve_night(room: Room, rng: random.Random | None = None) -> None:
    if room.phase != GamePhase.NIGHT_ACTION:
        raise InvalidPhaseTransition(f"resolve_night requires NIGHT_ACTION, got {room.phase}")

    resolve_night_actions(room, rng)
    room.night_actions = {}

    winner = check_win_condition(room)
    if winner:
        room.winner = winner
        room.phase = GamePhase.RESULT
    else:
        room.day_number += 1
        room.phase = GamePhase.DAY_DISCUSSION
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_state_machine.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add mafia_game/game/state_machine.py tests/test_state_machine.py
git commit -m "feat: add day/night game state machine"
```

---

## Task 13: In-Memory API Layer

**Files:**
- Create: `mafia_game/api/store.py`
- Create: `mafia_game/api/app.py`
- Test: `tests/test_api.py`

**Interfaces:**
- Consumes: everything from Tasks 2–12 (`Room`, `Player`, `GamePhase`, `PersonaScores`, `start_game`, `begin_discussion`, `open_vote`, `resolve_day`, `resolve_night`).
- Produces: `RoomStore` (in-memory store: `create(room)`, `get(room_id) -> Room`, `clear()`), FastAPI `app` with the endpoints listed in Step 3.

- [ ] **Step 1: Write the failing tests**

`tests/test_api.py`:
```python
from fastapi.testclient import TestClient

from mafia_game.api.app import app, store
from mafia_game.persona.provider import MockPersonaProvider


def setup_function():
    store.clear()


def _persona_payload(player_ids: list[str], seed: int) -> dict:
    personas = MockPersonaProvider(seed=seed).get_personas(player_ids)
    return {
        "players": [
            {
                "playerId": pid,
                "personaScores": {
                    "initiative": p.initiative,
                    "analysis": p.analysis,
                    "empathy": p.empathy,
                    "caution": p.caution,
                },
            }
            for pid, p in personas.items()
        ]
    }


def test_full_game_flow_through_the_api():
    client = TestClient(app)

    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]

    player_ids = []
    for i in range(4):
        resp = client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"})
        player_ids.append(resp.json()["player_id"])

    persona_resp = client.post(f"/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=1))
    assert persona_resp.status_code == 200

    start_resp = client.post(f"/rooms/{room_id}/start")
    assert start_resp.json()["phase"] == "ROLE_ASSIGNMENT"

    assert client.post(f"/rooms/{room_id}/advance").json()["phase"] == "DAY_DISCUSSION"
    assert client.post(f"/rooms/{room_id}/advance").json()["phase"] == "DAY_VOTE"

    state = client.get(f"/rooms/{room_id}/state").json()
    alive_ids = [p["player_id"] for p in state["players"]]
    target = alive_ids[0]
    for voter_id in player_ids:
        client.post(f"/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": target})

    advance_resp = client.post(f"/rooms/{room_id}/advance").json()
    assert advance_resp["phase"] in ("NIGHT_ACTION", "RESULT")

    if advance_resp["phase"] == "NIGHT_ACTION":
        result_probe = client.get(f"/rooms/{room_id}/result")
        assert result_probe.status_code == 400
        state = client.get(f"/rooms/{room_id}/state").json()
        alive_ids = [p["player_id"] for p in state["players"] if p["is_alive"]]
        client.post(
            f"/rooms/{room_id}/night-action",
            json={"actor_id": alive_ids[0], "action_type": "kill", "target_id": alive_ids[-1]},
        )
        advance_resp = client.post(f"/rooms/{room_id}/advance").json()

    assert advance_resp["phase"] == "RESULT"
    result = client.get(f"/rooms/{room_id}/result").json()
    assert result["winner"] in {"mafia", "citizen"}
    assert len(result["players"]) == 4
    for p in result["players"]:
        assert p["role"] in {"mafia", "police", "doctor", "citizen"}


def test_first_joiner_becomes_host_and_state_exposes_it():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]

    first = client.post(f"/rooms/{room_id}/join", json={"nickname": "a"}).json()
    second = client.post(f"/rooms/{room_id}/join", json={"nickname": "b"}).json()

    assert first["is_host"] is True
    assert second["is_host"] is False

    state = client.get(f"/rooms/{room_id}/state").json()
    assert state["host_player_id"] == first["player_id"]
    assert state["player_count"] == 4


def test_mock_persona_endpoint_fills_all_joined_players():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]

    resp = client.post(f"/rooms/{room_id}/persona/mock", params={"seed": 5})
    assert resp.status_code == 200

    start_resp = client.post(f"/rooms/{room_id}/start")
    assert start_resp.json()["phase"] == "ROLE_ASSIGNMENT"
    roles = {pid: client.get(f"/rooms/{room_id}/players/{pid}/me").json()["role"] for pid in player_ids}
    assert set(roles.values()) == {"mafia", "police", "doctor", "citizen"}


def test_unknown_room_returns_404():
    client = TestClient(app)
    resp = client.get("/rooms/does-not-exist/state")
    assert resp.status_code == 404


def test_start_without_full_persona_data_returns_400():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    for i in range(4):
        client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"})

    resp = client.post(f"/rooms/{room_id}/start")
    assert resp.status_code == 400


def test_result_includes_persona_scores_for_the_radar_chart():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=9))
    client.post(f"/rooms/{room_id}/start")
    client.post(f"/rooms/{room_id}/advance")  # -> DAY_DISCUSSION
    client.post(f"/rooms/{room_id}/advance")  # -> DAY_VOTE
    state = client.get(f"/rooms/{room_id}/state").json()
    target = state["players"][0]["player_id"]
    for voter_id in player_ids:
        client.post(f"/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": target})
    day_result = client.post(f"/rooms/{room_id}/advance").json()
    if day_result["phase"] == "NIGHT_ACTION":
        client.post(f"/rooms/{room_id}/advance")

    result = client.get(f"/rooms/{room_id}/result").json()
    for p in result["players"]:
        assert set(p["persona_scores"].keys()) == {"initiative", "analysis", "empathy", "caution"}
        for value in p["persona_scores"].values():
            assert 0 <= value <= 100


def test_private_role_and_investigation_result_via_me_endpoint():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=3))
    client.post(f"/rooms/{room_id}/start")

    roles = {}
    for pid in player_ids:
        me = client.get(f"/rooms/{room_id}/players/{pid}/me").json()
        assert me["role"] in {"mafia", "police", "doctor", "citizen"}
        assert me["assigned_by"] in {"preference", "fallback_random"}
        assert me["investigation_result"] is None
        roles[pid] = me["role"]
    assert set(roles.values()) == {"mafia", "police", "doctor", "citizen"}

    police_id = next(pid for pid, role in roles.items() if role == "police")
    mafia_id = next(pid for pid, role in roles.items() if role == "mafia")
    # 4인 방은 mafia 1 / police 1 / doctor 1 / citizen 1이므로 mafia도
    # police도 아닌 사람이 정확히 하나 존재한다(둘 다 살아있어야 하는
    # 이후 단계와 충돌하지 않도록 이 사람만 투표로 제거한다).
    bystander_id = next(pid for pid, role in roles.items() if role not in ("mafia", "police"))

    client.post(f"/rooms/{room_id}/advance")  # -> DAY_DISCUSSION
    client.post(f"/rooms/{room_id}/advance")  # -> DAY_VOTE
    for voter_id in player_ids:
        client.post(f"/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": bystander_id})
    day_result = client.post(f"/rooms/{room_id}/advance").json()
    assert day_result["phase"] == "NIGHT_ACTION"

    client.post(
        f"/rooms/{room_id}/night-action",
        json={"actor_id": police_id, "action_type": "investigate", "target_id": mafia_id},
    )
    client.post(f"/rooms/{room_id}/advance")

    police_view = client.get(f"/rooms/{room_id}/players/{police_id}/me").json()
    assert police_view["investigation_result"] == {
        "police_id": police_id,
        "target_id": mafia_id,
        "is_mafia": True,
    }

    other_alive_id = next(pid for pid in player_ids if pid != police_id and pid != bystander_id)
    other_view = client.get(f"/rooms/{room_id}/players/{other_alive_id}/me").json()
    assert other_view["investigation_result"] is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_api.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.api.app'`

- [ ] **Step 3: Implement the store and API**

`mafia_game/api/store.py`:
```python
from mafia_game.game.state import Room


class RoomStore:
    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}

    def create(self, room: Room) -> None:
        self._rooms[room.room_id] = room

    def get(self, room_id: str) -> Room:
        if room_id not in self._rooms:
            raise KeyError(f"Room not found: {room_id}")
        return self._rooms[room_id]

    def clear(self) -> None:
        self._rooms.clear()
```

`mafia_game/api/app.py`:
```python
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from mafia_game.api.store import RoomStore
from mafia_game.game import state_machine
from mafia_game.game.state import GamePhase, Player, Room
from mafia_game.persona.provider import MockPersonaProvider
from mafia_game.persona.schema import PersonaScores

app = FastAPI(title="Mafia Game API")
# 로컬 Vite 개발 서버(5173)에서 별도 오리진으로 호출하므로 CORS를 열어둔다.
# 배포 시에는 실제 프론트엔드 도메인으로 좁혀야 한다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
store = RoomStore()


class CreateRoomRequest(BaseModel):
    player_count: int


class JoinRoomRequest(BaseModel):
    nickname: str


class PersonaEntry(BaseModel):
    player_id: str = Field(alias="playerId")
    persona_scores: dict[str, int] = Field(alias="personaScores")

    model_config = {"populate_by_name": True}


class SubmitPersonaRequest(BaseModel):
    players: list[PersonaEntry]


class VoteRequest(BaseModel):
    voter_id: str
    target_id: str


class NightActionRequest(BaseModel):
    actor_id: str
    action_type: str
    target_id: str


def _get_room_or_404(room_id: str) -> Room:
    try:
        return store.get(room_id)
    except KeyError:
        raise HTTPException(404, "Room not found")


@app.post("/rooms")
def create_room(req: CreateRoomRequest):
    if req.player_count not in (4, 5, 6):
        raise HTTPException(400, "player_count must be 4, 5, or 6")
    room_id = str(uuid.uuid4())
    store.create(Room(room_id=room_id, player_count=req.player_count))
    return {"room_id": room_id}


@app.post("/rooms/{room_id}/join")
def join_room(room_id: str, req: JoinRoomRequest):
    room = _get_room_or_404(room_id)
    if len(room.players) >= room.player_count:
        raise HTTPException(400, "Room is full")
    player_id = str(uuid.uuid4())
    room.players[player_id] = Player(player_id=player_id, nickname=req.nickname)
    if room.host_player_id is None:
        room.host_player_id = player_id
    return {"player_id": player_id, "is_host": room.host_player_id == player_id}


@app.post("/rooms/{room_id}/persona/mock")
def submit_mock_persona(room_id: str, seed: int | None = None):
    """실제 페르소나 데이터 팀 연동 전, 대기실에서 방장이 눌러 무작위
    성향 데이터를 채우는 데모/검증용 엔드포인트. 실제 서비스에서는
    이 엔드포인트 대신 외부 팀이 POST /rooms/{room_id}/persona를 직접
    호출하며, 그 경로는 이 엔드포인트와 완전히 독립적이다."""
    room = _get_room_or_404(room_id)
    provider = MockPersonaProvider(seed=seed)
    room.personas = provider.get_personas(list(room.players.keys()))
    return {"status": "ok"}


@app.post("/rooms/{room_id}/persona")
def submit_persona(room_id: str, req: SubmitPersonaRequest):
    room = _get_room_or_404(room_id)
    personas: dict[str, PersonaScores] = {}
    for entry in req.players:
        if entry.player_id not in room.players:
            raise HTTPException(400, f"Unknown player_id: {entry.player_id}")
        personas[entry.player_id] = PersonaScores.from_partial(entry.persona_scores)
    room.personas = personas
    return {"status": "ok"}


@app.post("/rooms/{room_id}/start")
def start_room(room_id: str):
    room = _get_room_or_404(room_id)
    if len(room.personas) != room.player_count:
        raise HTTPException(400, "Persona data missing for some players")
    try:
        state_machine.start_game(room, room.personas)
    except state_machine.InvalidPhaseTransition as exc:
        raise HTTPException(400, str(exc))
    return {"phase": room.phase.value}


@app.post("/rooms/{room_id}/advance")
def advance(room_id: str):
    room = _get_room_or_404(room_id)
    transitions = {
        GamePhase.ROLE_ASSIGNMENT: state_machine.begin_discussion,
        GamePhase.DAY_DISCUSSION: state_machine.open_vote,
        GamePhase.DAY_VOTE: state_machine.resolve_day,
        GamePhase.NIGHT_ACTION: state_machine.resolve_night,
    }
    transition = transitions.get(room.phase)
    if transition is None:
        raise HTTPException(400, f"Cannot advance from phase {room.phase.value}")
    transition(room)
    return {"phase": room.phase.value}


@app.post("/rooms/{room_id}/vote")
def submit_vote(room_id: str, req: VoteRequest):
    room = _get_room_or_404(room_id)
    if room.phase != GamePhase.DAY_VOTE:
        raise HTTPException(400, "Voting is only allowed during DAY_VOTE phase")
    room.votes[req.voter_id] = req.target_id
    return {"status": "ok"}


@app.post("/rooms/{room_id}/night-action")
def submit_night_action(room_id: str, req: NightActionRequest):
    room = _get_room_or_404(room_id)
    if room.phase != GamePhase.NIGHT_ACTION:
        raise HTTPException(400, "Night actions are only allowed during NIGHT_ACTION phase")
    room.night_actions[req.actor_id] = (req.action_type, req.target_id)
    return {"status": "ok"}


@app.get("/rooms/{room_id}/state")
def get_state(room_id: str):
    room = _get_room_or_404(room_id)
    return {
        "phase": room.phase.value,
        "day_number": room.day_number,
        "night_number": room.night_number,
        "host_player_id": room.host_player_id,
        "player_count": room.player_count,
        "players": [
            {"player_id": p.player_id, "nickname": p.nickname, "is_alive": p.is_alive}
            for p in room.players.values()
        ],
    }


@app.get("/rooms/{room_id}/result")
def get_result(room_id: str):
    room = _get_room_or_404(room_id)
    if room.phase != GamePhase.RESULT:
        raise HTTPException(400, "Result is only available after the game ends")
    return {
        "winner": room.winner,
        "players": [
            {
                "player_id": p.player_id,
                "nickname": p.nickname,
                "role": p.role,
                "is_alive": p.is_alive,
                "assigned_score": p.assigned_score,
                "assigned_by": p.assigned_by,
                "persona_scores": {
                    "initiative": room.personas[p.player_id].initiative,
                    "analysis": room.personas[p.player_id].analysis,
                    "empathy": room.personas[p.player_id].empathy,
                    "caution": room.personas[p.player_id].caution,
                },
            }
            for p in room.players.values()
        ],
    }


@app.get("/rooms/{room_id}/players/{player_id}/me")
def get_my_view(room_id: str, player_id: str):
    """본인 역할과 (본인이 경찰일 때만) 최근 밤 조사 결과를 반환하는
    비공개 뷰. 다른 플레이어의 역할은 절대 이 엔드포인트로 노출되지 않는다."""
    room = _get_room_or_404(room_id)
    if player_id not in room.players:
        raise HTTPException(404, "Player not found")
    player = room.players[player_id]

    investigation_result = None
    if room.investigation_result and room.investigation_result["police_id"] == player_id:
        investigation_result = room.investigation_result

    return {
        "player_id": player.player_id,
        "nickname": player.nickname,
        "is_alive": player.is_alive,
        "role": player.role,
        "assigned_score": player.assigned_score,
        "assigned_by": player.assigned_by,
        "investigation_result": investigation_result,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_api.py -v`
Expected: PASS (7 passed)

- [ ] **Step 5: Commit**

```bash
git add mafia_game/api/store.py mafia_game/api/app.py tests/test_api.py
git commit -m "feat: add in-memory FastAPI layer for room lifecycle"
```

---

## Task 14: Assignment Algorithm Validation (Mock Data)

**Files:**
- Create: `mafia_game/validation/simulate.py`
- Test: `tests/test_simulate.py`

**Interfaces:**
- Consumes: `MockPersonaProvider` (Task 3), `assign_roles` (Task 6), `get_role_capacity` (Task 5).
- Produces: `run_simulation(player_count: int, trials: int, seed: int = 42) -> dict`.

This is the "성능 검증" deliverable: run the assignment algorithm across many random mock-persona trials and confirm it always respects role capacity, for every supported player count, before any real persona data exists.

- [ ] **Step 1: Write the failing tests**

`tests/test_simulate.py`:
```python
from mafia_game.roles.capacity import get_role_capacity
from mafia_game.validation.simulate import run_simulation


def test_run_simulation_never_violates_role_capacity():
    for player_count in (4, 5, 6):
        result = run_simulation(player_count, trials=100, seed=42)
        capacity = get_role_capacity(player_count)
        for role, cap in capacity.items():
            assert result["role_distribution"].get(role, 0) == cap * 100


def test_run_simulation_reports_fallback_rate_per_role():
    result = run_simulation(4, trials=50, seed=1)
    assert set(result["fallback_rate_by_role"].keys()) == {"mafia", "police", "doctor", "citizen"}
    for rate in result["fallback_rate_by_role"].values():
        assert 0.0 <= rate <= 1.0


def test_run_simulation_is_deterministic_given_the_same_seed():
    a = run_simulation(6, trials=20, seed=7)
    b = run_simulation(6, trials=20, seed=7)
    assert a == b
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_simulate.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'mafia_game.validation.simulate'`

- [ ] **Step 3: Implement the simulation**

`mafia_game/validation/simulate.py`:
```python
import random
from collections import Counter

from mafia_game.persona.provider import MockPersonaProvider
from mafia_game.roles.assignment import assign_roles
from mafia_game.roles.capacity import get_role_capacity


def run_simulation(player_count: int, trials: int, seed: int = 42) -> dict:
    capacity = get_role_capacity(player_count)
    rng = random.Random(seed)
    provider = MockPersonaProvider(seed=seed)

    role_counts: Counter = Counter()
    fallback_counts: Counter = Counter()

    for _ in range(trials):
        player_ids = [f"p{i}" for i in range(player_count)]
        personas = provider.get_personas(player_ids)
        assignments = assign_roles(personas, capacity, rng)
        for assignment in assignments.values():
            role_counts[assignment.role] += 1
            if assignment.assigned_by == "fallback_random":
                fallback_counts[assignment.role] += 1

    return {
        "trials": trials,
        "player_count": player_count,
        "role_distribution": dict(role_counts),
        "fallback_rate_by_role": {
            role: (fallback_counts[role] / role_counts[role]) if role_counts[role] else 0.0
            for role in capacity
        },
    }


if __name__ == "__main__":
    for player_count in (4, 5, 6):
        print(run_simulation(player_count, trials=1000))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_simulate.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Run the full test suite and commit**

Run: `pytest -v`
Expected: all tests across all 14 tasks PASS.

```bash
git add mafia_game/validation/simulate.py tests/test_simulate.py
git commit -m "feat: add mock-data simulation for assignment algorithm validation"
```
