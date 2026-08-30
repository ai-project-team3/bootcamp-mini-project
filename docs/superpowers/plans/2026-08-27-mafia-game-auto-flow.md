# 마피아 게임 자동 진행 플로우 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 낮 토론/투표에 타이머를 붙이고, 낮 투표 후 최후변론 → 찬반투표 단계를 새로 추가하고, 방장의 수동 "다음 단계" 버튼을 전부 없애 서버가 사회자처럼 자동으로 게임을 진행하게 만든다. 결과 화면에는 같은 방으로 재시작하는 "로비로 이동" 버튼을 추가한다.

**Architecture:** 실시간 타이머/백그라운드 스레드 없이, 기존 1초 폴링(`GET /rooms/{id}/state`) 구조 위에 "지연 평가(lazy tick)"를 얹는다. `Room.phase_deadline`(마감 시각)을 두고, `GET /state` 호출마다 서버가 "생존자 전원이 이번 단계 행동을 완료했는가" 또는 "마감 시각이 지났는가"를 확인해 필요하면 그 순간 다음 단계로 전이시킨 뒤 상태를 반환한다. 프론트는 `phase_deadline`을 받아 카운트다운만 표시하고, 방장 전용 수동 진행 버튼은 전부 제거한다.

**Tech Stack:** FastAPI + pytest (백엔드), React + TypeScript + Vite + vitest + @testing-library/react (프론트엔드). 기존 스택 그대로 사용, 새 라이브러리 추가 없음.

**Spec:** `docs/superpowers/specs/2026-08-27-mafia-game-auto-flow-design.md`

## Global Constraints

- 실시간(WebSocket) 통신이나 서버 백그라운드 타이머를 도입하지 않는다 — 기존 1초 폴링 구조를 유지한다 (스펙 §3).
- 타이머 길이는 `mafia_game/game/timing.py` 상수로만 관리한다: `ROLE_ASSIGNMENT_SECONDS=15`, `DAY_DISCUSSION_SECONDS=90`, `DAY_VOTE_SECONDS=45`, `FINAL_DEFENSE_SECONDS=30`, `EXECUTION_VOTE_SECONDS=20`, `NIGHT_ACTION_SECONDS=30` (스펙 §4.3).
- 찬반투표(`EXECUTION_VOTE`)에서 찬성이 반대보다 많을 때만 처형한다. 동률·무투표는 생존 처리한다 (스펙 §4.4).
- 낮 투표(`DAY_VOTE`)와 찬반투표는 한 번 "완료"하면 다시 바꿀 수 없다 — 완료와 동시에 서버에 전송되고 잠긴다 (스펙 §6.2, §6.3).
- `POST /rooms/{id}/restart`는 `RESULT` 단계에서만 허용되며, 인원(`players`)과 `host_player_id`는 유지하고 나머지 게임 상태만 초기화한다 (스펙 §6.4).
- 프론트엔드 코드는 더 이상 `POST /advance`를 호출하지 않는다. 이 엔드포인트는 테스트/내부 재사용 목적으로만 유지한다 (스펙 §3, §6.5).
- 모든 단계 변경은 TDD로 진행한다: 실패하는 테스트 작성 → 실행해서 실패 확인 → 최소 구현 → 통과 확인 → 커밋.

---

## File Structure

**백엔드 (`mafia_game/`)**
- `mafia_game/game/timing.py` (신규) — 단계별 타이머 길이 상수
- `mafia_game/game/state.py` (수정) — `GamePhase`에 `FINAL_DEFENSE`/`EXECUTION_VOTE` 추가, `Room`에 타이머/변론/찬반투표 관련 필드 추가
- `mafia_game/game/state_machine.py` (수정) — 새 단계 전이 함수, `restart_room`, `tick()` 자동 진행 엔진
- `mafia_game/api/app.py` (수정) — 투표 완료-잠금, 찬반투표 엔드포인트, 재시작 엔드포인트, `GET /state`에서 `tick()` 호출
- `tests/test_game_state.py`, `tests/test_state_machine.py`, `tests/test_api.py` (수정)

**프론트엔드 (`frontend/src/`)**
- `hooks/useCountdown.ts` (신규) — `phase_deadline`으로부터 남은 초를 계산하는 훅
- `api/types.ts`, `api/client.ts` (수정) — 새 필드/엔드포인트 반영
- `pages/DayPage.tsx` (수정) — 지목 선택 하이라이트 + "투표 완료" 버튼
- `pages/FinalDefensePage.tsx` (신규)
- `pages/ExecutionVotePage.tsx` (신규)
- `pages/RoleRevealPage.tsx`, `pages/NightPage.tsx` (수정) — 수동 버튼 제거, 카운트다운으로 교체
- `pages/ResultPage.tsx` (수정) — "로비로 이동" 버튼
- `App.tsx` (수정) — 새 단계 라우팅
- `styles.css` (수정) — 카운트다운, 선택 하이라이트, 찬반 버튼 스타일

---

### Task 1: 게임 상태 필드 & 타이머 상수

**Files:**
- Create: `mafia_game/game/timing.py`
- Modify: `mafia_game/game/state.py` (전체 교체)
- Test: `tests/test_game_state.py` (기존 파일에 테스트 추가)

**Interfaces:**
- Produces: `GamePhase.FINAL_DEFENSE`, `GamePhase.EXECUTION_VOTE`; `Room.phase_deadline: float | None`, `Room.accused_player_id: str | None`, `Room.votes_confirmed: set[str]`, `Room.execution_votes: dict[str, str]`, `Room.execution_confirmed: set[str]`; `timing.ROLE_ASSIGNMENT_SECONDS` 등 6개 상수.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_game_state.py` 맨 아래에 추가:

```python
def test_room_starts_with_no_deadline_or_accusation_and_empty_execution_vote_tracking():
    room = Room(room_id="r1", player_count=4)
    assert room.phase_deadline is None
    assert room.accused_player_id is None
    assert room.votes_confirmed == set()
    assert room.execution_votes == {}
    assert room.execution_confirmed == set()


def test_game_phase_includes_final_defense_and_execution_vote():
    assert GamePhase.FINAL_DEFENSE.value == "FINAL_DEFENSE"
    assert GamePhase.EXECUTION_VOTE.value == "EXECUTION_VOTE"
```

- [ ] **Step 2: 실패 확인**

Run: `python -m pytest tests/test_game_state.py -v`
Expected: FAIL — `AttributeError: 'Room' object has no attribute 'phase_deadline'` (및 `GamePhase`에 해당 값 없음)

- [ ] **Step 3: `timing.py` 작성**

`mafia_game/game/timing.py`:

```python
"""각 게임 단계의 자동 진행 타이머 길이(초). 값만 바꾸면 전체 진행 속도가 조정된다."""

ROLE_ASSIGNMENT_SECONDS = 15
DAY_DISCUSSION_SECONDS = 90
DAY_VOTE_SECONDS = 45
FINAL_DEFENSE_SECONDS = 30
EXECUTION_VOTE_SECONDS = 20
NIGHT_ACTION_SECONDS = 30
```

- [ ] **Step 4: `state.py` 전체 교체**

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
    FINAL_DEFENSE = "FINAL_DEFENSE"
    EXECUTION_VOTE = "EXECUTION_VOTE"
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
    votes_confirmed: set[str] = field(default_factory=set)
    accused_player_id: str | None = None
    execution_votes: dict[str, str] = field(default_factory=dict)
    execution_confirmed: set[str] = field(default_factory=set)
    night_actions: dict[str, tuple[str, str]] = field(default_factory=dict)
    investigation_result: dict | None = None
    winner: str | None = None
    host_player_id: str | None = None
    phase_deadline: float | None = None
```

- [ ] **Step 5: 통과 확인**

Run: `python -m pytest tests/test_game_state.py -v`
Expected: PASS (기존 3개 + 신규 2개 = 5개 테스트 모두 통과)

- [ ] **Step 6: 커밋**

```bash
git add mafia_game/game/state.py mafia_game/game/timing.py tests/test_game_state.py
git commit -m "feat: add timer/final-defense/execution-vote fields to game state"
```

---

### Task 2: 상태 머신 — 새 단계 전이, 방 재시작, 자동 진행(tick) 엔진

**Files:**
- Modify: `mafia_game/game/state_machine.py` (전체 교체)
- Test: `tests/test_state_machine.py` (전체 교체)

**Interfaces:**
- Consumes: Task 1의 `GamePhase.FINAL_DEFENSE`/`EXECUTION_VOTE`, `Room.phase_deadline`/`accused_player_id`/`votes_confirmed`/`execution_votes`/`execution_confirmed`, `timing.*_SECONDS`.
- Produces: `resolve_final_defense(room)`, `resolve_execution_vote(room)`, `restart_room(room)`, `tick(room, now=None)`. 기존 `start_game`, `begin_discussion`, `open_vote`, `resolve_day`, `resolve_night`는 그대로 이름 유지(동작만 확장).

- [ ] **Step 1: 실패하는 테스트로 전체 교체**

`tests/test_state_machine.py` 전체를 아래 내용으로 교체 (기존 4개 테스트 + 신규 테스트 포함):

```python
import random
import time

import pytest

from mafia_game.game.state import Room, Player, GamePhase
from mafia_game.game.state_machine import (
    start_game,
    begin_discussion,
    open_vote,
    resolve_day,
    resolve_final_defense,
    resolve_execution_vote,
    resolve_night,
    restart_room,
    tick,
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


def test_start_game_sets_a_role_assignment_deadline():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    before = time.time()

    start_game(room, personas, rng=random.Random(1))

    assert room.phase_deadline is not None
    assert room.phase_deadline > before


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

    assert room.phase == GamePhase.FINAL_DEFENSE
    assert room.accused_player_id == non_mafia.player_id

    resolve_final_defense(room)
    assert room.phase == GamePhase.EXECUTION_VOTE

    for voter_id in room.players:
        if voter_id != non_mafia.player_id:
            room.execution_votes[voter_id] = "guilty"
    resolve_execution_vote(room)

    assert room.players[non_mafia.player_id].is_alive is False
    assert room.accused_player_id is None
    assert room.phase in (GamePhase.NIGHT_ACTION, GamePhase.RESULT)

    if room.phase == GamePhase.NIGHT_ACTION:
        mafia = next(p for p in room.players.values() if p.role == "mafia" and p.is_alive)
        target = next(p for p in room.players.values() if p.is_alive and p.role != "mafia")
        room.night_actions[mafia.player_id] = ("kill", target.player_id)
        resolve_night(room, rng=rng)

    assert room.phase == GamePhase.RESULT
    assert room.winner in {"mafia", "citizen"}


def test_resolve_day_with_no_votes_skips_final_defense_and_goes_straight_to_night():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=2).get_personas(list(room.players))
    rng = random.Random(2)
    start_game(room, personas, rng=rng)
    begin_discussion(room)
    open_vote(room)

    resolve_day(room, rng=rng)

    assert room.phase == GamePhase.NIGHT_ACTION
    assert room.accused_player_id is None


def test_resolve_execution_vote_spares_the_accused_on_a_tie():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=3).get_personas(list(room.players))
    rng = random.Random(3)
    start_game(room, personas, rng=rng)
    begin_discussion(room)
    open_vote(room)
    target = next(iter(room.players))
    for voter_id in room.players:
        room.votes[voter_id] = target
    resolve_day(room, rng=rng)
    resolve_final_defense(room)

    jurors = [pid for pid in room.players if pid != target]
    room.execution_votes = {jurors[0]: "guilty", jurors[1]: "innocent"}

    resolve_execution_vote(room)

    assert room.players[target].is_alive is True
    assert room.accused_player_id is None


def test_restart_room_resets_state_but_keeps_players_and_host():
    room = _new_room(4)
    room.host_player_id = next(iter(room.players))
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    start_game(room, personas, rng=random.Random(1))
    room.phase = GamePhase.RESULT
    room.winner = "citizen"

    restart_room(room)

    assert room.phase == GamePhase.WAITING_ROOM
    assert room.winner is None
    assert room.phase_deadline is None
    assert room.personas == {}
    assert len(room.players) == 4
    assert room.host_player_id is not None
    for player in room.players.values():
        assert player.role is None
        assert player.assigned_score is None
        assert player.assigned_by is None
        assert player.is_alive is True


def test_restart_room_rejects_non_result_phase():
    room = _new_room(4)
    with pytest.raises(InvalidPhaseTransition):
        restart_room(room)


def test_tick_does_nothing_before_the_deadline():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    start_game(room, personas, rng=random.Random(1))
    room.phase_deadline = time.time() + 999

    tick(room)

    assert room.phase == GamePhase.ROLE_ASSIGNMENT


def test_tick_advances_once_the_deadline_has_passed():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    start_game(room, personas, rng=random.Random(1))
    room.phase_deadline = time.time() - 1

    tick(room)

    assert room.phase == GamePhase.DAY_DISCUSSION


def test_tick_advances_early_when_all_alive_players_have_confirmed_votes():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    start_game(room, personas, rng=random.Random(1))
    begin_discussion(room)
    open_vote(room)
    room.phase_deadline = time.time() + 999
    target = next(iter(room.players))
    for voter_id in room.players:
        room.votes[voter_id] = target
        room.votes_confirmed.add(voter_id)

    tick(room)

    assert room.phase == GamePhase.FINAL_DEFENSE
    assert room.accused_player_id == target


def test_tick_waits_for_the_deadline_when_only_some_players_have_confirmed():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=1).get_personas(list(room.players))
    start_game(room, personas, rng=random.Random(1))
    begin_discussion(room)
    open_vote(room)
    room.phase_deadline = time.time() + 999
    voter_ids = list(room.players)
    room.votes[voter_ids[0]] = voter_ids[1]
    room.votes_confirmed.add(voter_ids[0])

    tick(room)

    assert room.phase == GamePhase.DAY_VOTE


def test_tick_advances_night_action_early_once_every_required_role_has_acted():
    room = _new_room(4)
    personas = MockPersonaProvider(seed=7).get_personas(list(room.players))
    rng = random.Random(7)
    start_game(room, personas, rng=rng)
    begin_discussion(room)
    open_vote(room)
    resolve_day(room, rng=rng)
    if room.phase == GamePhase.FINAL_DEFENSE:
        resolve_final_defense(room)
        resolve_execution_vote(room)
    assert room.phase == GamePhase.NIGHT_ACTION
    room.phase_deadline = time.time() + 999

    for player in room.players.values():
        if player.is_alive and player.role in ("mafia", "police", "doctor"):
            target = next(p for p in room.players.values() if p.player_id != player.player_id)
            action = {"mafia": "kill", "police": "investigate", "doctor": "protect"}[player.role]
            room.night_actions[player.player_id] = (action, target.player_id)

    tick(room)

    assert room.phase in (GamePhase.DAY_DISCUSSION, GamePhase.RESULT)
```

- [ ] **Step 2: 실패 확인**

Run: `python -m pytest tests/test_state_machine.py -v`
Expected: FAIL — `ImportError: cannot import name 'resolve_final_defense'` (등 신규 심볼 없음)

- [ ] **Step 3: `state_machine.py` 전체 교체**

`mafia_game/game/state_machine.py`:

```python
import random
import time

from mafia_game.game import timing
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
    room.phase_deadline = time.time() + timing.ROLE_ASSIGNMENT_SECONDS


def begin_discussion(room: Room) -> None:
    if room.phase != GamePhase.ROLE_ASSIGNMENT:
        raise InvalidPhaseTransition(f"begin_discussion requires ROLE_ASSIGNMENT, got {room.phase}")
    room.day_number = 1
    room.phase = GamePhase.DAY_DISCUSSION
    room.phase_deadline = time.time() + timing.DAY_DISCUSSION_SECONDS


def open_vote(room: Room) -> None:
    if room.phase != GamePhase.DAY_DISCUSSION:
        raise InvalidPhaseTransition(f"open_vote requires DAY_DISCUSSION, got {room.phase}")
    room.phase = GamePhase.DAY_VOTE
    room.phase_deadline = time.time() + timing.DAY_VOTE_SECONDS


def resolve_day(room: Room, rng: random.Random | None = None) -> None:
    if room.phase != GamePhase.DAY_VOTE:
        raise InvalidPhaseTransition(f"resolve_day requires DAY_VOTE, got {room.phase}")

    eliminated = tally_votes(room, rng)
    room.votes = {}
    room.votes_confirmed = set()

    if eliminated:
        room.accused_player_id = eliminated
        room.phase = GamePhase.FINAL_DEFENSE
        room.phase_deadline = time.time() + timing.FINAL_DEFENSE_SECONDS
    else:
        _enter_night(room)


def resolve_final_defense(room: Room) -> None:
    if room.phase != GamePhase.FINAL_DEFENSE:
        raise InvalidPhaseTransition(f"resolve_final_defense requires FINAL_DEFENSE, got {room.phase}")
    room.phase = GamePhase.EXECUTION_VOTE
    room.phase_deadline = time.time() + timing.EXECUTION_VOTE_SECONDS


def resolve_execution_vote(room: Room) -> None:
    if room.phase != GamePhase.EXECUTION_VOTE:
        raise InvalidPhaseTransition(f"resolve_execution_vote requires EXECUTION_VOTE, got {room.phase}")

    guilty = sum(1 for verdict in room.execution_votes.values() if verdict == "guilty")
    innocent = sum(1 for verdict in room.execution_votes.values() if verdict == "innocent")
    if guilty > innocent and room.accused_player_id is not None:
        room.players[room.accused_player_id].is_alive = False

    room.execution_votes = {}
    room.execution_confirmed = set()
    room.accused_player_id = None

    winner = check_win_condition(room)
    if winner:
        room.winner = winner
        room.phase = GamePhase.RESULT
        room.phase_deadline = None
    else:
        _enter_night(room)


def resolve_night(room: Room, rng: random.Random | None = None) -> None:
    if room.phase != GamePhase.NIGHT_ACTION:
        raise InvalidPhaseTransition(f"resolve_night requires NIGHT_ACTION, got {room.phase}")

    resolve_night_actions(room, rng)
    room.night_actions = {}

    winner = check_win_condition(room)
    if winner:
        room.winner = winner
        room.phase = GamePhase.RESULT
        room.phase_deadline = None
    else:
        room.day_number += 1
        room.phase = GamePhase.DAY_DISCUSSION
        room.phase_deadline = time.time() + timing.DAY_DISCUSSION_SECONDS


def restart_room(room: Room) -> None:
    if room.phase != GamePhase.RESULT:
        raise InvalidPhaseTransition(f"restart_room requires RESULT, got {room.phase}")

    for player in room.players.values():
        player.role = None
        player.assigned_score = None
        player.assigned_by = None
        player.is_alive = True

    room.personas = {}
    room.phase = GamePhase.WAITING_ROOM
    room.day_number = 0
    room.night_number = 0
    room.votes = {}
    room.votes_confirmed = set()
    room.accused_player_id = None
    room.execution_votes = {}
    room.execution_confirmed = set()
    room.night_actions = {}
    room.investigation_result = None
    room.winner = None
    room.phase_deadline = None


def _enter_night(room: Room) -> None:
    room.night_number += 1
    room.phase = GamePhase.NIGHT_ACTION
    room.phase_deadline = time.time() + timing.NIGHT_ACTION_SECONDS


def _day_vote_complete(room: Room) -> bool:
    alive_ids = {p.player_id for p in room.players.values() if p.is_alive}
    return bool(alive_ids) and alive_ids <= room.votes_confirmed


def _execution_vote_complete(room: Room) -> bool:
    required = {p.player_id for p in room.players.values() if p.is_alive}
    required.discard(room.accused_player_id)
    return bool(required) and required <= room.execution_confirmed


def _night_action_complete(room: Room) -> bool:
    required = {
        p.player_id
        for p in room.players.values()
        if p.is_alive and p.role in ("mafia", "police", "doctor")
    }
    return bool(required) and required <= set(room.night_actions.keys())


_EARLY_COMPLETE_CHECKS = {
    GamePhase.DAY_VOTE: _day_vote_complete,
    GamePhase.EXECUTION_VOTE: _execution_vote_complete,
    GamePhase.NIGHT_ACTION: _night_action_complete,
}

_DEADLINE_TRANSITIONS = {
    GamePhase.ROLE_ASSIGNMENT: begin_discussion,
    GamePhase.DAY_DISCUSSION: open_vote,
    GamePhase.DAY_VOTE: resolve_day,
    GamePhase.FINAL_DEFENSE: resolve_final_defense,
    GamePhase.EXECUTION_VOTE: resolve_execution_vote,
    GamePhase.NIGHT_ACTION: resolve_night,
}


def tick(room: Room, now: float | None = None) -> None:
    """방장 없이 서버가 스스로 진행하는 사회자 역할.

    생존자 전원이 해당 단계의 행동(투표/찬반투표/밤 능력)을 완료했으면
    타이머가 남아 있어도 즉시 다음 단계로 넘어가고, 그렇지 않으면
    phase_deadline이 지났을 때만 강제로 다음 단계로 넘어간다. 한 번의
    호출은 최대 한 단계만 전이시킨다 (다음 폴링에서 다시 호출된다).
    """
    transition = _DEADLINE_TRANSITIONS.get(room.phase)
    if transition is None:
        return

    now = time.time() if now is None else now
    early_check = _EARLY_COMPLETE_CHECKS.get(room.phase)
    completed_early = early_check is not None and early_check(room)
    deadline_passed = room.phase_deadline is not None and now >= room.phase_deadline

    if completed_early or deadline_passed:
        transition(room)
```

- [ ] **Step 4: 통과 확인**

Run: `python -m pytest tests/test_state_machine.py -v`
Expected: PASS (전체 통과)

- [ ] **Step 5: 회귀 확인**

Run: `python -m pytest tests -v`
Expected: `tests/test_api.py`는 아직 옛 흐름 가정이 남아 있어 일부 FAIL 예상 (Task 3에서 수정) — 그 외 파일은 전부 PASS.

- [ ] **Step 6: 커밋**

```bash
git add mafia_game/game/state_machine.py tests/test_state_machine.py
git commit -m "feat: add final-defense/execution-vote transitions, restart, and lazy-tick auto-advance"
```

---

### Task 3: API — 투표 완료-잠금, 찬반투표, 재시작, 자동 진행

**Files:**
- Modify: `mafia_game/api/app.py` (전체 교체)
- Test: `tests/test_api.py` (전체 교체)

**Interfaces:**
- Consumes: Task 2의 `state_machine.resolve_final_defense/resolve_execution_vote/restart_room/tick`.
- Produces: `POST /rooms/{id}/execution-vote`, `POST /rooms/{id}/restart`. `GET /state` 응답에 `phase_deadline`, `accused_player_id` 필드 추가. `POST /vote`는 호출과 동시에 확정(잠금)됨.

- [ ] **Step 1: 실패하는 테스트로 전체 교체**

`tests/test_api.py` 전체를 아래 내용으로 교체:

```python
from fastapi.testclient import TestClient

from mafia_game.api.app import app, store
from mafia_game.game.state import GamePhase
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
    assert advance_resp["phase"] == "FINAL_DEFENSE"

    advance_resp = client.post(f"/rooms/{room_id}/advance").json()
    assert advance_resp["phase"] == "EXECUTION_VOTE"

    state = client.get(f"/rooms/{room_id}/state").json()
    accused_id = state["accused_player_id"]
    assert accused_id == target
    jurors = [pid for pid in player_ids if pid != accused_id]
    for voter_id in jurors:
        client.post(f"/rooms/{room_id}/execution-vote", json={"voter_id": voter_id, "verdict": "guilty"})

    advance_resp = client.post(f"/rooms/{room_id}/advance").json()
    assert advance_resp["phase"] in ("NIGHT_ACTION", "RESULT")

    state = client.get(f"/rooms/{room_id}/state").json()
    accused_player = next(p for p in state["players"] if p["player_id"] == accused_id)
    assert accused_player["is_alive"] is False

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

    restart_resp = client.post(f"/rooms/{room_id}/restart")
    assert restart_resp.json()["phase"] == "WAITING_ROOM"
    state = client.get(f"/rooms/{room_id}/state").json()
    assert state["phase"] == "WAITING_ROOM"
    assert state["player_count"] == 4
    assert len(state["players"]) == 4
    assert state["personas_ready"] is False


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
    client.post(f"/rooms/{room_id}/advance")  # -> FINAL_DEFENSE
    client.post(f"/rooms/{room_id}/advance")  # -> EXECUTION_VOTE
    jurors = [pid for pid in player_ids if pid != target]
    for voter_id in jurors:
        client.post(f"/rooms/{room_id}/execution-vote", json={"voter_id": voter_id, "verdict": "guilty"})
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
    bystander_id = next(pid for pid, role in roles.items() if role not in ("mafia", "police"))

    client.post(f"/rooms/{room_id}/advance")  # -> DAY_DISCUSSION
    client.post(f"/rooms/{room_id}/advance")  # -> DAY_VOTE
    for voter_id in player_ids:
        client.post(f"/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": bystander_id})
    client.post(f"/rooms/{room_id}/advance")  # -> FINAL_DEFENSE
    client.post(f"/rooms/{room_id}/advance")  # -> EXECUTION_VOTE
    jurors = [pid for pid in player_ids if pid != bystander_id]
    for voter_id in jurors:
        client.post(f"/rooms/{room_id}/execution-vote", json={"voter_id": voter_id, "verdict": "guilty"})
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
    assert state["personas_ready"] is False
    assert state["phase_deadline"] is None
    assert state["accused_player_id"] is None


def test_state_reports_personas_ready_once_all_players_have_persona_data():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    for i in range(4):
        client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"})

    assert client.get(f"/rooms/{room_id}/state").json()["personas_ready"] is False

    client.post(f"/rooms/{room_id}/persona/mock", params={"seed": 1})

    assert client.get(f"/rooms/{room_id}/state").json()["personas_ready"] is True


def test_fill_test_players_completes_the_room_for_solo_playthrough():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    client.post(f"/rooms/{room_id}/join", json={"nickname": "host"})

    resp = client.post(f"/rooms/{room_id}/fill-test-players")
    assert resp.status_code == 200
    assert resp.json()["player_count"] == 4

    state = client.get(f"/rooms/{room_id}/state").json()
    assert len(state["players"]) == 4

    client.post(f"/rooms/{room_id}/persona/mock")
    assert client.get(f"/rooms/{room_id}/state").json()["personas_ready"] is True

    start_resp = client.post(f"/rooms/{room_id}/start")
    assert start_resp.json()["phase"] == "ROLE_ASSIGNMENT"


def test_fill_test_players_is_a_noop_when_room_already_full():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    for i in range(4):
        client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"})

    resp = client.post(f"/rooms/{room_id}/fill-test-players")

    assert resp.json()["player_count"] == 4
    state = client.get(f"/rooms/{room_id}/state").json()
    assert len(state["players"]) == 4


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


def test_vote_cannot_be_changed_after_confirming():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=4))
    client.post(f"/rooms/{room_id}/start")
    client.post(f"/rooms/{room_id}/advance")
    client.post(f"/rooms/{room_id}/advance")  # -> DAY_VOTE

    voter, first_target, second_target = player_ids[0], player_ids[1], player_ids[2]
    ok = client.post(f"/rooms/{room_id}/vote", json={"voter_id": voter, "target_id": first_target})
    assert ok.status_code == 200

    blocked = client.post(f"/rooms/{room_id}/vote", json={"voter_id": voter, "target_id": second_target})
    assert blocked.status_code == 400


def test_execution_vote_rejects_the_accused_voting_on_themself():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=5))
    client.post(f"/rooms/{room_id}/start")
    client.post(f"/rooms/{room_id}/advance")
    client.post(f"/rooms/{room_id}/advance")  # -> DAY_VOTE
    target = player_ids[0]
    for voter_id in player_ids:
        client.post(f"/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": target})
    client.post(f"/rooms/{room_id}/advance")  # -> FINAL_DEFENSE
    client.post(f"/rooms/{room_id}/advance")  # -> EXECUTION_VOTE

    resp = client.post(f"/rooms/{room_id}/execution-vote", json={"voter_id": target, "verdict": "guilty"})
    assert resp.status_code == 400


def test_restart_requires_result_phase():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    resp = client.post(f"/rooms/{room_id}/restart")
    assert resp.status_code == 400


def test_restart_resets_room_to_waiting_room_keeping_players_and_host():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=2))
    client.post(f"/rooms/{room_id}/start")
    room = store.get(room_id)
    room.phase = GamePhase.RESULT
    room.winner = "citizen"

    resp = client.post(f"/rooms/{room_id}/restart")
    assert resp.json()["phase"] == "WAITING_ROOM"

    state = client.get(f"/rooms/{room_id}/state").json()
    assert state["phase"] == "WAITING_ROOM"
    assert state["host_player_id"] == player_ids[0]
    assert len(state["players"]) == 4
    assert state["personas_ready"] is False


def test_get_state_auto_advances_when_deadline_has_passed():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=6))
    client.post(f"/rooms/{room_id}/start")

    room = store.get(room_id)
    assert room.phase == GamePhase.ROLE_ASSIGNMENT
    room.phase_deadline = 0  # 이미 지난 시각으로 강제 설정

    state = client.get(f"/rooms/{room_id}/state").json()
    assert state["phase"] == "DAY_DISCUSSION"


def test_get_state_auto_advances_early_when_all_alive_players_confirm_their_vote():
    client = TestClient(app)
    room_id = client.post("/rooms", json={"player_count": 4}).json()["room_id"]
    player_ids = [
        client.post(f"/rooms/{room_id}/join", json={"nickname": f"p{i}"}).json()["player_id"]
        for i in range(4)
    ]
    client.post(f"/rooms/{room_id}/persona", json=_persona_payload(player_ids, seed=8))
    client.post(f"/rooms/{room_id}/start")
    client.post(f"/rooms/{room_id}/advance")
    client.post(f"/rooms/{room_id}/advance")  # -> DAY_VOTE

    target = player_ids[0]
    for voter_id in player_ids:
        client.post(f"/rooms/{room_id}/vote", json={"voter_id": voter_id, "target_id": target})

    # 타이머는 아직 넉넉히 남아 있지만 전원이 완료했으므로 즉시 다음 단계로 넘어가야 한다
    state = client.get(f"/rooms/{room_id}/state").json()
    assert state["phase"] == "FINAL_DEFENSE"
    assert state["accused_player_id"] == target
```

- [ ] **Step 2: 실패 확인**

Run: `python -m pytest tests/test_api.py -v`
Expected: FAIL — `advance_resp["phase"] == "FINAL_DEFENSE"` 단언 실패 (현재 앱은 아직 `NIGHT_ACTION`으로 바로 감), `/execution-vote` `/restart` 404 등.

- [ ] **Step 3: `app.py` 전체 교체**

`mafia_game/api/app.py`:

```python
import uuid
from typing import Literal

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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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


class ExecutionVoteRequest(BaseModel):
    voter_id: str
    verdict: Literal["guilty", "innocent"]


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


@app.post("/rooms/{room_id}/fill-test-players")
def fill_test_players(room_id: str):
    """혼자서 전체 플레이를 테스트할 수 있도록 부족한 인원을 테스트봇으로
    채우는 개발/데모 전용 엔드포인트. 실제 서비스에서는 사용하지 않는다 —
    실제 인원은 QR/방 코드로 각자 들어온다."""
    room = _get_room_or_404(room_id)
    bot_index = 1
    while len(room.players) < room.player_count:
        player_id = str(uuid.uuid4())
        room.players[player_id] = Player(player_id=player_id, nickname=f"테스트봇{bot_index}")
        if room.host_player_id is None:
            room.host_player_id = player_id
        bot_index += 1
    return {"status": "ok", "player_count": len(room.players)}


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
    """방장 수동 진행용이 아니라 테스트/내부 재사용을 위해 남겨둔 엔드포인트.
    실제 프론트엔드는 GET /state 호출마다 실행되는 tick()에 의존하며 이
    엔드포인트를 호출하지 않는다."""
    room = _get_room_or_404(room_id)
    transitions = {
        GamePhase.ROLE_ASSIGNMENT: state_machine.begin_discussion,
        GamePhase.DAY_DISCUSSION: state_machine.open_vote,
        GamePhase.DAY_VOTE: state_machine.resolve_day,
        GamePhase.FINAL_DEFENSE: state_machine.resolve_final_defense,
        GamePhase.EXECUTION_VOTE: state_machine.resolve_execution_vote,
        GamePhase.NIGHT_ACTION: state_machine.resolve_night,
    }
    transition = transitions.get(room.phase)
    if transition is None:
        raise HTTPException(400, f"Cannot advance from phase {room.phase.value}")
    transition(room)
    return {"phase": room.phase.value}


@app.post("/rooms/{room_id}/restart")
def restart_room_endpoint(room_id: str):
    room = _get_room_or_404(room_id)
    try:
        state_machine.restart_room(room)
    except state_machine.InvalidPhaseTransition as exc:
        raise HTTPException(400, str(exc))
    return {"phase": room.phase.value}


@app.post("/rooms/{room_id}/vote")
def submit_vote(room_id: str, req: VoteRequest):
    room = _get_room_or_404(room_id)
    if room.phase != GamePhase.DAY_VOTE:
        raise HTTPException(400, "Voting is only allowed during DAY_VOTE phase")
    if req.voter_id in room.votes_confirmed:
        raise HTTPException(400, "이미 투표를 완료했습니다")
    room.votes[req.voter_id] = req.target_id
    room.votes_confirmed.add(req.voter_id)
    return {"status": "ok"}


@app.post("/rooms/{room_id}/execution-vote")
def submit_execution_vote(room_id: str, req: ExecutionVoteRequest):
    room = _get_room_or_404(room_id)
    if room.phase != GamePhase.EXECUTION_VOTE:
        raise HTTPException(400, "찬반투표는 EXECUTION_VOTE 단계에서만 가능합니다")
    if req.voter_id == room.accused_player_id:
        raise HTTPException(400, "지목된 사람은 투표할 수 없습니다")
    if req.voter_id in room.execution_confirmed:
        raise HTTPException(400, "이미 투표를 완료했습니다")
    room.execution_votes[req.voter_id] = req.verdict
    room.execution_confirmed.add(req.voter_id)
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
    state_machine.tick(room)
    return {
        "phase": room.phase.value,
        "day_number": room.day_number,
        "night_number": room.night_number,
        "host_player_id": room.host_player_id,
        "player_count": room.player_count,
        "personas_ready": len(room.personas) == room.player_count,
        "phase_deadline": room.phase_deadline,
        "accused_player_id": room.accused_player_id,
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

- [ ] **Step 4: 통과 확인**

Run: `python -m pytest tests -v`
Expected: PASS (전체 스위트)

- [ ] **Step 5: 커밋**

```bash
git add mafia_game/api/app.py tests/test_api.py
git commit -m "feat: add execution-vote/restart endpoints and lazy-tick on GET /state"
```

---

### Task 4: 프론트엔드 공통 — 타입/클라이언트/카운트다운 훅

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/client.ts`
- Test: `frontend/src/api/client.test.ts`
- Create: `frontend/src/hooks/useCountdown.ts`
- Test: `frontend/src/hooks/useCountdown.test.ts`

**Interfaces:**
- Produces: `RoomState.phase_deadline: number | null`, `RoomState.accused_player_id: string | null`, `GamePhase`에 `"FINAL_DEFENSE" | "EXECUTION_VOTE"` 추가, `ExecutionVerdict = "guilty" | "innocent"`, `submitExecutionVote(roomId, voterId, verdict): Promise<{status: string}>`, `restartRoom(roomId): Promise<{phase: string}>`, `useCountdown(deadlineSeconds: number | null): number`.

- [ ] **Step 1: `useCountdown`의 실패하는 테스트 작성**

`frontend/src/hooks/useCountdown.test.ts`:

```typescript
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./useCountdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1000 * 1000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the whole seconds remaining until the deadline", () => {
    const { result } = renderHook(() => useCountdown(1010));
    expect(result.current).toBe(10);
  });

  it("counts down as time passes", () => {
    const { result } = renderHook(() => useCountdown(1010));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(7);
  });

  it("clamps to zero once the deadline has passed", () => {
    const { result } = renderHook(() => useCountdown(1010));
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(result.current).toBe(0);
  });

  it("returns 0 when there is no deadline", () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current).toBe(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/hooks/useCountdown.test.ts`
Expected: FAIL — `Cannot find module './useCountdown'`

- [ ] **Step 3: `useCountdown.ts` 구현**

`frontend/src/hooks/useCountdown.ts`:

```typescript
import { useEffect, useState } from "react";

export function useCountdown(deadlineSeconds: number | null): number {
  const [remaining, setRemaining] = useState(() => computeRemaining(deadlineSeconds));

  useEffect(() => {
    setRemaining(computeRemaining(deadlineSeconds));
    if (deadlineSeconds === null) return;

    const intervalId = window.setInterval(() => {
      setRemaining(computeRemaining(deadlineSeconds));
    }, 250);
    return () => window.clearInterval(intervalId);
  }, [deadlineSeconds]);

  return remaining;
}

function computeRemaining(deadlineSeconds: number | null): number {
  if (deadlineSeconds === null) return 0;
  return Math.max(0, Math.ceil(deadlineSeconds - Date.now() / 1000));
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/hooks/useCountdown.test.ts`
Expected: PASS

- [ ] **Step 5: 타입/클라이언트에 실패하는 테스트 추가**

`frontend/src/api/client.test.ts` 맨 아래에 추가 (기존 import에 `restartRoom`, `submitExecutionVote` 추가):

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoom, getRoomState, restartRoom, submitExecutionVote } from "./client";
```

파일 맨 아래, `describe` 블록 안에 추가:

```typescript
  it("submitExecutionVote posts voter_id and verdict", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitExecutionVote("room1", "p1", "guilty");

    expect(result).toEqual({ status: "ok" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/rooms/room1/execution-vote");
    expect(JSON.parse(options.body as string)).toEqual({ voter_id: "p1", verdict: "guilty" });
  });

  it("restartRoom posts to the restart endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ phase: "WAITING_ROOM" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await restartRoom("room1");

    expect(result).toEqual({ phase: "WAITING_ROOM" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/rooms/room1/restart");
    expect(options.method).toBe("POST");
  });
```

- [ ] **Step 6: 실패 확인**

Run: `npx vitest run src/api/client.test.ts`
Expected: FAIL — `submitExecutionVote`/`restartRoom`이 `client.ts`에 없음

- [ ] **Step 7: `types.ts`, `client.ts` 수정**

`frontend/src/api/types.ts` 전체 교체:

```typescript
export type GamePhase =
  | "WAITING_ROOM"
  | "ROLE_ASSIGNMENT"
  | "DAY_DISCUSSION"
  | "DAY_VOTE"
  | "FINAL_DEFENSE"
  | "EXECUTION_VOTE"
  | "NIGHT_ACTION"
  | "RESULT";

export type Role = "mafia" | "police" | "doctor" | "citizen";
export type AssignedBy = "preference" | "fallback_random";
export type ExecutionVerdict = "guilty" | "innocent";

export interface RoomPlayerSummary {
  player_id: string;
  nickname: string;
  is_alive: boolean;
}

export interface RoomState {
  phase: GamePhase;
  day_number: number;
  night_number: number;
  host_player_id: string | null;
  player_count: number;
  personas_ready: boolean;
  phase_deadline: number | null;
  accused_player_id: string | null;
  players: RoomPlayerSummary[];
}

export interface InvestigationResult {
  police_id: string;
  target_id: string;
  is_mafia: boolean;
}

export interface MyView {
  player_id: string;
  nickname: string;
  is_alive: boolean;
  role: Role | null;
  assigned_score: number | null;
  assigned_by: AssignedBy | null;
  investigation_result: InvestigationResult | null;
}

export interface PersonaScores {
  initiative: number;
  analysis: number;
  empathy: number;
  caution: number;
}

export interface ResultPlayer {
  player_id: string;
  nickname: string;
  role: Role;
  is_alive: boolean;
  assigned_score: number;
  assigned_by: AssignedBy;
  persona_scores: PersonaScores;
}

export interface GameResult {
  winner: "mafia" | "citizen";
  players: ResultPlayer[];
}
```

`frontend/src/api/client.ts` 전체 교체:

```typescript
import type { ExecutionVerdict, GameResult, MyView, RoomState } from "./types";

const API_BASE = "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export function createRoom(playerCount: number) {
  return request<{ room_id: string }>("/rooms", {
    method: "POST",
    body: JSON.stringify({ player_count: playerCount }),
  });
}

export function joinRoom(roomId: string, nickname: string) {
  return request<{ player_id: string; is_host: boolean }>(`/rooms/${roomId}/join`, {
    method: "POST",
    body: JSON.stringify({ nickname }),
  });
}

export function fillTestPlayers(roomId: string) {
  return request<{ status: string; player_count: number }>(`/rooms/${roomId}/fill-test-players`, {
    method: "POST",
  });
}

export function submitMockPersona(roomId: string, seed?: number) {
  const query = seed !== undefined ? `?seed=${seed}` : "";
  return request<{ status: string }>(`/rooms/${roomId}/persona/mock${query}`, {
    method: "POST",
  });
}

export function startGame(roomId: string) {
  return request<{ phase: string }>(`/rooms/${roomId}/start`, { method: "POST" });
}

export function advancePhase(roomId: string) {
  return request<{ phase: string }>(`/rooms/${roomId}/advance`, { method: "POST" });
}

export function restartRoom(roomId: string) {
  return request<{ phase: string }>(`/rooms/${roomId}/restart`, { method: "POST" });
}

export function castVote(roomId: string, voterId: string, targetId: string) {
  return request<{ status: string }>(`/rooms/${roomId}/vote`, {
    method: "POST",
    body: JSON.stringify({ voter_id: voterId, target_id: targetId }),
  });
}

export function submitExecutionVote(roomId: string, voterId: string, verdict: ExecutionVerdict) {
  return request<{ status: string }>(`/rooms/${roomId}/execution-vote`, {
    method: "POST",
    body: JSON.stringify({ voter_id: voterId, verdict }),
  });
}

export function submitNightAction(
  roomId: string,
  actorId: string,
  actionType: string,
  targetId: string
) {
  return request<{ status: string }>(`/rooms/${roomId}/night-action`, {
    method: "POST",
    body: JSON.stringify({ actor_id: actorId, action_type: actionType, target_id: targetId }),
  });
}

export function getRoomState(roomId: string) {
  return request<RoomState>(`/rooms/${roomId}/state`);
}

export function getMyView(roomId: string, playerId: string) {
  return request<MyView>(`/rooms/${roomId}/players/${playerId}/me`);
}

export function getResult(roomId: string) {
  return request<GameResult>(`/rooms/${roomId}/result`);
}
```

(`advancePhase`는 아직 `DayPage`/`RoleRevealPage`/`NightPage`에서 쓰이고 있으므로 이번 태스크에서는 지우지 않는다 — Task 8에서 마지막 호출부를 제거한 뒤 함께 삭제한다.)

기존 `frontend/src/api/client.test.ts`, `frontend/src/pages/WaitingRoomPage.test.tsx` 등에서 `RoomState` 리터럴을 만드는 곳은 TypeScript가 `phase_deadline`/`accused_player_id` 누락을 에러로 잡아준다 — 이 태스크에서는 `client.test.ts`의 `getRoomState` 목 응답 객체에도 두 필드를 추가한다:

`frontend/src/api/client.test.ts`의 `getRoomState issues a GET...` 테스트 내 `json: async () => ({...})` 객체에 다음 두 줄 추가:

```typescript
        phase_deadline: null,
        accused_player_id: null,
```

- [ ] **Step 8: 통과 확인**

Run: `npx vitest run src/api/client.test.ts src/hooks/useCountdown.test.ts`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: 다른 파일들(`WaitingRoomPage.test.tsx` 등)에서 `RoomState` 리터럴에 새 필드가 없다는 타입 에러가 날 수 있음 — 이 태스크에서는 `WaitingRoomPage.test.tsx`의 `baseState`에도 두 필드를 추가해 통과시킨다:

`frontend/src/pages/WaitingRoomPage.test.tsx`의 `baseState` 객체에 추가:

```typescript
  phase_deadline: null,
  accused_player_id: null,
```

Run: `npx tsc --noEmit`
Expected: 에러 없음 (아직 컴파일되는 다른 페이지 파일들의 `RoomState` 리터럴은 Task 5~10에서 순차적으로 고친다 — 이 시점에 남아있는 에러가 있다면 그 파일 이름을 확인해 동일하게 두 필드를 추가한다)

- [ ] **Step 9: 커밋**

```bash
git add frontend/src/api/types.ts frontend/src/api/client.ts frontend/src/api/client.test.ts frontend/src/hooks/useCountdown.ts frontend/src/hooks/useCountdown.test.ts frontend/src/pages/WaitingRoomPage.test.tsx
git commit -m "feat: add countdown hook and execution-vote/restart API client functions"
```

---

### Task 5: DayPage — 지목 선택 하이라이트 + "투표 완료" 확정

**Files:**
- Modify: `frontend/src/pages/DayPage.tsx`
- Modify: `frontend/src/pages/DayPage.test.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: `useCountdown` (Task 4), `castVote` (기존).
- Produces: `.countdown`, `.target-row.is-selected` CSS 클래스 (다른 페이지에서도 재사용).

- [ ] **Step 1: 실패하는 테스트로 전체 교체**

`frontend/src/pages/DayPage.test.tsx` 전체 교체:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DayPage } from "./DayPage";
import * as client from "../api/client";
import type { RoomState } from "../api/types";

const players = [
  { player_id: "p1", nickname: "정글짐", is_alive: true },
  { player_id: "p2", nickname: "라이트", is_alive: true },
  { player_id: "p3", nickname: "죽음", is_alive: false },
];

describe("DayPage", () => {
  it("shows a countdown during discussion and no vote controls", () => {
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 1,
      night_number: 0,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      players,
    };
    render(<DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />);

    expect(screen.getByText("토론 시간")).toBeInTheDocument();
    expect(screen.queryByText("투표 완료")).not.toBeInTheDocument();
  });

  it("lists only alive players as vote targets, highlights the selection, and requires confirm to cast the vote", async () => {
    const spy = vi.spyOn(client, "castVote").mockResolvedValue({ status: "ok" });
    const state: RoomState = {
      phase: "DAY_VOTE",
      day_number: 1,
      night_number: 0,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      players,
    };
    render(<DayPage session={{ roomId: "r1", playerId: "p2", isHost: false }} state={state} />);

    expect(screen.queryByText("죽음")).not.toBeInTheDocument();
    const confirmButton = screen.getByText("투표 완료");
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getAllByText("지목하기")[0]);
    expect(confirmButton).not.toBeDisabled();
    expect(spy).not.toHaveBeenCalled();

    fireEvent.click(confirmButton);

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1", "p2", "p1"));
    expect(await screen.findByText("투표를 완료했습니다. 다른 사람을 기다리는 중...")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/pages/DayPage.test.tsx`
Expected: FAIL — "투표 시작" 버튼이 남아있고 "투표 완료" 버튼이 disabled 상태로 시작하지 않음

- [ ] **Step 3: `DayPage.tsx` 전체 교체**

`frontend/src/pages/DayPage.tsx`:

```tsx
import { useState } from "react";
import { castVote } from "../api/client";
import { useCountdown } from "../hooks/useCountdown";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { RoomState } from "../api/types";

interface DayPageProps {
  session: PlayerSession;
  state: RoomState;
}

export function DayPage({ session, state }: DayPageProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const remaining = useCountdown(state.phase_deadline);
  const alivePlayers = state.players.filter((p) => p.is_alive);

  if (state.phase === "DAY_DISCUSSION") {
    return (
      <div className="card stack-lg">
        <div className="stack">
          <h2>낮 {state.day_number}일차</h2>
          <h1>토론 시간</h1>
          <p className="countdown">⏱ 남은 시간: {remaining}초</p>
        </div>
        <p>누가 마피아인지 이야기해보세요.</p>
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!selectedTargetId) return;
    await castVote(session.roomId, session.playerId, selectedTargetId);
    setConfirmed(true);
  };

  return (
    <div className="card stack-lg">
      <div className="stack">
        <h2>낮 {state.day_number}일차</h2>
        <h1>누구를 지목할까요?</h1>
        <p className="countdown">⏱ 남은 시간: {remaining}초</p>
      </div>
      {confirmed ? (
        <p>투표를 완료했습니다. 다른 사람을 기다리는 중...</p>
      ) : (
        <>
          <ul className="target-list">
            {alivePlayers.map((p) => (
              <li
                key={p.player_id}
                className={`target-row ${selectedTargetId === p.player_id ? "is-selected" : ""}`}
              >
                <span className="player-name">{p.nickname}</span>
                <button className="btn btn-secondary" onClick={() => setSelectedTargetId(p.player_id)}>
                  {selectedTargetId === p.player_id ? "선택됨" : "지목하기"}
                </button>
              </li>
            ))}
          </ul>
          <button
            className="btn btn-primary btn-block"
            onClick={handleConfirm}
            disabled={!selectedTargetId}
          >
            투표 완료
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/pages/DayPage.test.tsx`
Expected: PASS

- [ ] **Step 5: 스타일 추가**

`frontend/src/styles.css`의 `.target-row { ... }` 블록 바로 뒤에 추가:

```css
.target-row.is-selected {
  border-color: var(--accent);
  background: rgba(227, 176, 75, 0.12);
}

.countdown {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--accent-strong);
  font-size: 0.95rem;
  margin: 0;
}
```

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/pages/DayPage.tsx frontend/src/pages/DayPage.test.tsx frontend/src/styles.css
git commit -m "feat: require selecting then confirming a vote target in DayPage"
```

---

### Task 6: FinalDefensePage (신규)

**Files:**
- Create: `frontend/src/pages/FinalDefensePage.tsx`
- Create: `frontend/src/pages/FinalDefensePage.test.tsx`

**Interfaces:**
- Consumes: `useCountdown` (Task 4), `RoomState.accused_player_id`/`phase_deadline`.
- Produces: `FinalDefensePage({ state }: { state: RoomState })`.

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/pages/FinalDefensePage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinalDefensePage } from "./FinalDefensePage";
import type { RoomState } from "../api/types";

const state: RoomState = {
  phase: "FINAL_DEFENSE",
  day_number: 1,
  night_number: 0,
  host_player_id: "p1",
  player_count: 3,
  personas_ready: true,
  phase_deadline: null,
  accused_player_id: "p2",
  players: [
    { player_id: "p1", nickname: "정글짐", is_alive: true },
    { player_id: "p2", nickname: "라이트", is_alive: true },
  ],
};

describe("FinalDefensePage", () => {
  it("shows the accused player's nickname in the defense prompt", () => {
    render(<FinalDefensePage state={state} />);
    expect(screen.getByText("라이트님의 최후 변론 시간입니다")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/pages/FinalDefensePage.test.tsx`
Expected: FAIL — `Cannot find module './FinalDefensePage'`

- [ ] **Step 3: 구현**

`frontend/src/pages/FinalDefensePage.tsx`:

```tsx
import { useCountdown } from "../hooks/useCountdown";
import type { RoomState } from "../api/types";

interface FinalDefensePageProps {
  state: RoomState;
}

export function FinalDefensePage({ state }: FinalDefensePageProps) {
  const remaining = useCountdown(state.phase_deadline);
  const accused = state.players.find((p) => p.player_id === state.accused_player_id);

  return (
    <div className="card stack-lg">
      <div className="stack">
        <h2>낮 {state.day_number}일차 - 최후 변론</h2>
        <h1>{accused ? `${accused.nickname}님의 최후 변론 시간입니다` : "최후 변론 시간입니다"}</h1>
        <p className="countdown">⏱ 남은 시간: {remaining}초</p>
      </div>
      <p>지목된 사람은 자신이 마피아가 아닌 이유를 이야기해보세요.</p>
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/pages/FinalDefensePage.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/pages/FinalDefensePage.tsx frontend/src/pages/FinalDefensePage.test.tsx
git commit -m "feat: add FinalDefensePage"
```

---

### Task 7: ExecutionVotePage (신규)

**Files:**
- Create: `frontend/src/pages/ExecutionVotePage.tsx`
- Create: `frontend/src/pages/ExecutionVotePage.test.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: `useCountdown` (Task 4), `submitExecutionVote` (Task 4).
- Produces: `ExecutionVotePage({ session, state })`.

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/pages/ExecutionVotePage.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExecutionVotePage } from "./ExecutionVotePage";
import * as client from "../api/client";
import type { RoomState } from "../api/types";

const state: RoomState = {
  phase: "EXECUTION_VOTE",
  day_number: 1,
  night_number: 0,
  host_player_id: "p1",
  player_count: 3,
  personas_ready: true,
  phase_deadline: null,
  accused_player_id: "p2",
  players: [
    { player_id: "p1", nickname: "정글짐", is_alive: true },
    { player_id: "p2", nickname: "라이트", is_alive: true },
    { player_id: "p3", nickname: "보리", is_alive: true },
  ],
};

describe("ExecutionVotePage", () => {
  it("blocks the accused player from voting on themself", () => {
    render(<ExecutionVotePage session={{ roomId: "r1", playerId: "p2", isHost: false }} state={state} />);
    expect(screen.getByText("당신은 이번 투표에 참여할 수 없습니다.")).toBeInTheDocument();
    expect(screen.queryByText("찬성 (처형)")).not.toBeInTheDocument();
  });

  it("lets another alive player pick a verdict and confirm it", async () => {
    const spy = vi.spyOn(client, "submitExecutionVote").mockResolvedValue({ status: "ok" });
    render(<ExecutionVotePage session={{ roomId: "r1", playerId: "p3", isHost: false }} state={state} />);

    const confirmButton = screen.getByText("투표 완료");
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByText("찬성 (처형)"));
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1", "p3", "guilty"));
    expect(await screen.findByText("투표를 완료했습니다. 다른 사람을 기다리는 중...")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/pages/ExecutionVotePage.test.tsx`
Expected: FAIL — `Cannot find module './ExecutionVotePage'`

- [ ] **Step 3: 구현**

`frontend/src/pages/ExecutionVotePage.tsx`:

```tsx
import { useState } from "react";
import { submitExecutionVote } from "../api/client";
import { useCountdown } from "../hooks/useCountdown";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { ExecutionVerdict, RoomState } from "../api/types";

interface ExecutionVotePageProps {
  session: PlayerSession;
  state: RoomState;
}

export function ExecutionVotePage({ session, state }: ExecutionVotePageProps) {
  const [verdict, setVerdict] = useState<ExecutionVerdict | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const remaining = useCountdown(state.phase_deadline);
  const accused = state.players.find((p) => p.player_id === state.accused_player_id);
  const isAccused = session.playerId === state.accused_player_id;

  const handleConfirm = async () => {
    if (!verdict) return;
    await submitExecutionVote(session.roomId, session.playerId, verdict);
    setConfirmed(true);
  };

  return (
    <div className="card stack-lg">
      <div className="stack">
        <h2>낮 {state.day_number}일차 - 찬반 투표</h2>
        <h1>{accused?.nickname}님을 처형할까요?</h1>
        <p className="countdown">⏱ 남은 시간: {remaining}초</p>
      </div>

      {isAccused ? (
        <p>당신은 이번 투표에 참여할 수 없습니다.</p>
      ) : confirmed ? (
        <p>투표를 완료했습니다. 다른 사람을 기다리는 중...</p>
      ) : (
        <>
          <div className="verdict-buttons">
            <button
              className={`btn btn-secondary verdict-btn--guilty ${verdict === "guilty" ? "is-selected" : ""}`}
              onClick={() => setVerdict("guilty")}
            >
              찬성 (처형)
            </button>
            <button
              className={`btn btn-secondary verdict-btn--innocent ${verdict === "innocent" ? "is-selected" : ""}`}
              onClick={() => setVerdict("innocent")}
            >
              반대 (생존)
            </button>
          </div>
          <button className="btn btn-primary btn-block" onClick={handleConfirm} disabled={!verdict}>
            투표 완료
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/pages/ExecutionVotePage.test.tsx`
Expected: PASS

- [ ] **Step 5: 스타일 추가**

`frontend/src/styles.css` 맨 아래에 추가:

```css
.verdict-buttons {
  display: flex;
  gap: var(--space-3);
}

.verdict-buttons .btn {
  flex: 1;
}

.verdict-btn--guilty.is-selected {
  border-color: var(--danger);
  color: var(--danger);
  background: rgba(217, 105, 92, 0.12);
}

.verdict-btn--innocent.is-selected {
  border-color: var(--success);
  color: var(--success);
  background: rgba(111, 191, 133, 0.12);
}
```

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/pages/ExecutionVotePage.tsx frontend/src/pages/ExecutionVotePage.test.tsx frontend/src/styles.css
git commit -m "feat: add ExecutionVotePage"
```

---

### Task 8: RoleRevealPage & NightPage — 수동 진행 버튼 제거, 카운트다운으로 교체

**Files:**
- Modify: `frontend/src/pages/RoleRevealPage.tsx`
- Modify: `frontend/src/pages/RoleRevealPage.test.tsx`
- Modify: `frontend/src/pages/NightPage.tsx`
- Modify: `frontend/src/pages/NightPage.test.tsx`
- Modify: `frontend/src/api/client.ts` (`advancePhase` 제거)

**Interfaces:**
- Consumes: `useCountdown` (Task 4).
- Produces: `RoleRevealPage`가 이제 `state: RoomState`를 필수로 받음 (App.tsx는 Task 10에서 반영).

- [ ] **Step 1: 실패하는 테스트로 전체 교체**

`frontend/src/pages/RoleRevealPage.test.tsx` 전체 교체:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoleRevealPage } from "./RoleRevealPage";
import type { MyView, RoomState } from "../api/types";

const state: RoomState = {
  phase: "ROLE_ASSIGNMENT",
  day_number: 0,
  night_number: 0,
  host_player_id: "p1",
  player_count: 3,
  personas_ready: true,
  phase_deadline: null,
  accused_player_id: null,
  players: [],
};

function myView(overrides: Partial<MyView>): MyView {
  return {
    player_id: "p1",
    nickname: "정글짐",
    is_alive: true,
    role: "police",
    assigned_score: 82,
    assigned_by: "preference",
    investigation_result: null,
    ...overrides,
  };
}

describe("RoleRevealPage", () => {
  it("shows the player's own role", () => {
    render(
      <RoleRevealPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "doctor" })}
      />
    );
    expect(screen.getByTestId("role-label")).toHaveTextContent("의사");
  });

  it("shows fallback narrative language when assigned_by is fallback_random", () => {
    render(
      <RoleRevealPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ assigned_by: "fallback_random" })}
      />
    );
    expect(screen.getByText("운명이 이 역할을 선택했습니다.")).toBeInTheDocument();
  });

  it("shows a countdown instead of a manual advance button", () => {
    render(
      <RoleRevealPage
        session={{ roomId: "r1", playerId: "p1", isHost: true }}
        state={state}
        myView={myView({})}
      />
    );
    expect(screen.queryByText("모두 확인했다면 다음 단계로")).not.toBeInTheDocument();
    expect(screen.getByText(/잠시 후 낮이 시작됩니다/)).toBeInTheDocument();
  });
});
```

`frontend/src/pages/NightPage.test.tsx`의 `state` 객체에 두 필드 추가 (다른 부분은 그대로 유지):

```typescript
const state: RoomState = {
  phase: "NIGHT_ACTION",
  day_number: 1,
  night_number: 1,
  host_player_id: "p1",
  player_count: 3,
  personas_ready: true,
  phase_deadline: null,
  accused_player_id: null,
  players: [
    { player_id: "p1", nickname: "마피아유저", is_alive: true },
    { player_id: "p2", nickname: "다른사람", is_alive: true },
    { player_id: "p3", nickname: "또다른사람", is_alive: true },
  ],
};
```

같은 파일 `describe` 블록 안, 기존 세 개 테스트 뒤에 추가:

```tsx
  it("never shows a manual advance button", () => {
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: true }}
        state={state}
        myView={myView({ player_id: "p1", role: "citizen" })}
      />
    );
    expect(screen.queryByText("아침이 밝았습니다")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/pages/RoleRevealPage.test.tsx src/pages/NightPage.test.tsx`
Expected: FAIL — `RoleRevealPage`가 아직 `state` prop을 쓰지 않고, "모두 확인했다면 다음 단계로"/"아침이 밝았습니다" 버튼이 남아있음

- [ ] **Step 3: `RoleRevealPage.tsx` 전체 교체**

`frontend/src/pages/RoleRevealPage.tsx`:

```tsx
import { useCountdown } from "../hooks/useCountdown";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { MyView, Role, RoomState } from "../api/types";

const ROLE_LABELS: Record<Role, string> = {
  mafia: "마피아",
  police: "경찰",
  doctor: "의사",
  citizen: "시민",
};

interface RoleRevealPageProps {
  session: PlayerSession;
  state: RoomState;
  myView: MyView;
}

export function RoleRevealPage({ state, myView }: RoleRevealPageProps) {
  const remaining = useCountdown(state.phase_deadline);

  return (
    <div className="card stack-lg">
      <h2>당신의 직업</h2>
      <p data-testid="role-label" className={`role-badge ${myView.role ? `role-badge--${myView.role}` : ""}`}>
        {myView.role ? ROLE_LABELS[myView.role] : "배정 중..."}
      </p>
      {myView.assigned_by === "fallback_random" && (
        <p className="fate-note">운명이 이 역할을 선택했습니다.</p>
      )}
      <p className="countdown">⏱ 잠시 후 낮이 시작됩니다: {remaining}초</p>
    </div>
  );
}
```

- [ ] **Step 4: `NightPage.tsx` 전체 교체**

`frontend/src/pages/NightPage.tsx`:

```tsx
import { useState } from "react";
import { submitNightAction } from "../api/client";
import { useCountdown } from "../hooks/useCountdown";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { MyView, Role, RoomState } from "../api/types";

const ROLE_ACTION: Partial<Record<Role, string>> = {
  mafia: "kill",
  police: "investigate",
  doctor: "protect",
};

const ROLE_PROMPT: Partial<Record<Role, string>> = {
  mafia: "제거할 대상을 선택하세요",
  police: "조사할 대상을 선택하세요",
  doctor: "보호할 대상을 선택하세요",
};

interface NightPageProps {
  session: PlayerSession;
  state: RoomState;
  myView: MyView;
}

export function NightPage({ session, state, myView }: NightPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const remaining = useCountdown(state.phase_deadline);
  const alivePlayers = state.players.filter((p) => p.is_alive);
  const role = myView.role;
  const actionType = role ? ROLE_ACTION[role] : undefined;

  if (!actionType || !role) {
    return (
      <div className="card stack-lg">
        <h2>밤 {state.night_number}차</h2>
        <p>밤이 되었습니다. 다른 사람들이 움직이는 동안 기다려주세요.</p>
        <p className="countdown">⏱ 남은 시간: {remaining}초</p>
      </div>
    );
  }

  const handleAct = async (targetId: string) => {
    await submitNightAction(session.roomId, session.playerId, actionType, targetId);
    setSubmitted(true);
  };

  const targets = alivePlayers.filter((p) => p.player_id !== session.playerId || role === "doctor");

  return (
    <div className="card stack-lg">
      <h2>밤 {state.night_number}차</h2>
      <p className="countdown">⏱ 남은 시간: {remaining}초</p>
      {myView.investigation_result && (
        <p className="fate-note">
          지난 밤 조사 결과: {myView.investigation_result.is_mafia ? "마피아입니다!" : "마피아가 아닙니다."}
        </p>
      )}
      {submitted ? (
        <p>능력을 사용했습니다. 아침을 기다려주세요.</p>
      ) : (
        <ul className="target-list">
          {targets.map((p) => (
            <li key={p.player_id} className="target-row">
              <span className="player-name">{p.nickname}</span>
              <button className="btn btn-secondary" onClick={() => handleAct(p.player_id)}>
                {ROLE_PROMPT[role]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `client.ts`에서 `advancePhase` 제거**

`frontend/src/api/client.ts`에서 아래 블록을 삭제:

```typescript
export function advancePhase(roomId: string) {
  return request<{ phase: string }>(`/rooms/${roomId}/advance`, { method: "POST" });
}
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run src/pages/RoleRevealPage.test.tsx src/pages/NightPage.test.tsx`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: 에러 없음 (이 시점부터 `frontend/src` 어디에도 `advancePhase` 참조가 남아있지 않아야 한다)

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/pages/RoleRevealPage.tsx frontend/src/pages/RoleRevealPage.test.tsx frontend/src/pages/NightPage.tsx frontend/src/pages/NightPage.test.tsx frontend/src/api/client.ts
git commit -m "feat: replace manual advance buttons with countdowns in role reveal and night phases"
```

---

### Task 9: ResultPage — "로비로 이동" 재시작 버튼

**Files:**
- Modify: `frontend/src/pages/ResultPage.tsx`
- Modify: `frontend/src/pages/ResultPage.test.tsx`

**Interfaces:**
- Consumes: `restartRoom` (Task 4).

- [ ] **Step 1: 실패하는 테스트 추가**

`frontend/src/pages/ResultPage.test.tsx`의 `import` 줄을 다음으로 교체:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
```

같은 파일의 `describe` 블록 안, 기존 테스트 뒤에 추가:

```tsx
  it("lets the player go back to the lobby, restarting the same room", async () => {
    vi.spyOn(client, "getResult").mockResolvedValue(result);
    const restartSpy = vi.spyOn(client, "restartRoom").mockResolvedValue({ phase: "WAITING_ROOM" });

    render(<ResultPage session={{ roomId: "r1", playerId: "p1", isHost: true }} />);
    const restartButton = await screen.findByText("로비로 이동");

    fireEvent.click(restartButton);

    await waitFor(() => expect(restartSpy).toHaveBeenCalledWith("r1"));
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/pages/ResultPage.test.tsx`
Expected: FAIL — `screen.findByText("로비로 이동")`가 타임아웃

- [ ] **Step 3: `ResultPage.tsx` 전체 교체**

`frontend/src/pages/ResultPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { getResult, restartRoom } from "../api/client";
import { PersonaRadarChart } from "../components/PersonaRadarChart";
import { buildMatchReason } from "../utils/matchReason";
import { computeSuperlatives } from "../utils/superlatives";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { GameResult, Role } from "../api/types";

const ROLE_LABELS: Record<Role, string> = {
  mafia: "마피아",
  police: "경찰",
  doctor: "의사",
  citizen: "시민",
};

interface ResultPageProps {
  session: PlayerSession;
}

export function ResultPage({ session }: ResultPageProps) {
  const [result, setResult] = useState<GameResult | null>(null);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    getResult(session.roomId).then(setResult);
  }, [session.roomId]);

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await restartRoom(session.roomId);
    } finally {
      setRestarting(false);
    }
  };

  if (!result) {
    return (
      <div className="card">
        <p>결과를 불러오는 중...</p>
      </div>
    );
  }

  const superlatives = computeSuperlatives(result.players);
  const isMafiaWin = result.winner === "mafia";

  return (
    <div className="card card--wide stack-lg">
      <div className={`winner-banner ${isMafiaWin ? "winner-banner--mafia" : "winner-banner--citizen"}`}>
        <h1>{isMafiaWin ? "마피아 팀 승리!" : "시민 팀 승리!"}</h1>
      </div>

      <section className="stack">
        <h2>시상식</h2>
        <ul className="superlatives">
          {superlatives.map((s) => (
            <li key={s.title}>
              <span className="superlative-title">{s.title}</span>
              <span className="superlative-name">{s.player.nickname}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="result-players">
        {result.players.map((p) => (
          <article key={p.player_id} className={`player-result-card ${p.is_alive ? "" : "is-dead"}`}>
            <div className="player-result-header">
              <h3 className="player-result-name">
                {p.nickname} - {ROLE_LABELS[p.role]}
              </h3>
              <span className={`role-pill role-pill--${p.role}`}>{ROLE_LABELS[p.role]}</span>
            </div>
            <div className="radar-wrap">
              <PersonaRadarChart persona={p.persona_scores} />
            </div>
            <p className="match-reason">{buildMatchReason(p)}</p>
          </article>
        ))}
      </section>

      <button className="btn btn-primary btn-block" onClick={handleRestart} disabled={restarting}>
        {restarting ? "이동하는 중..." : "로비로 이동"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/pages/ResultPage.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/pages/ResultPage.tsx frontend/src/pages/ResultPage.test.tsx
git commit -m "feat: add lobby-restart button to ResultPage"
```

---

### Task 10: App.tsx — 새 단계 라우팅

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `FinalDefensePage` (Task 6), `ExecutionVotePage` (Task 7), 수정된 `RoleRevealPage` (Task 8).

- [ ] **Step 1: 실패하는 테스트 추가**

`frontend/src/App.test.tsx`의 기존 `RoomState` 목 객체들에 `phase_deadline: null, accused_player_id: null`을 추가하고, `describe` 블록 안에 다음 두 테스트를 추가:

```tsx
  it("renders FinalDefensePage when phase is FINAL_DEFENSE", () => {
    vi.spyOn(sessionHook, "usePlayerSession").mockReturnValue({
      session: { roomId: "r1", playerId: "p1", isHost: true },
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });
    vi.spyOn(stateHook, "useRoomState").mockReturnValue({
      state: {
        phase: "FINAL_DEFENSE",
        day_number: 1,
        night_number: 0,
        host_player_id: "p1",
        player_count: 4,
        personas_ready: true,
        phase_deadline: null,
        accused_player_id: "p1",
        players: [{ player_id: "p1", nickname: "정글짐", is_alive: true }],
      },
      error: null,
    });
    vi.spyOn(client, "getMyView").mockResolvedValue({
      player_id: "p1",
      nickname: "정글짐",
      is_alive: true,
      role: "citizen",
      assigned_score: 50,
      assigned_by: "preference",
      investigation_result: null,
    });

    render(<App />);
    expect(screen.getByText("정글짐님의 최후 변론 시간입니다")).toBeInTheDocument();
  });

  it("renders ExecutionVotePage when phase is EXECUTION_VOTE", () => {
    vi.spyOn(sessionHook, "usePlayerSession").mockReturnValue({
      session: { roomId: "r1", playerId: "p2", isHost: false },
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });
    vi.spyOn(stateHook, "useRoomState").mockReturnValue({
      state: {
        phase: "EXECUTION_VOTE",
        day_number: 1,
        night_number: 0,
        host_player_id: "p1",
        player_count: 4,
        personas_ready: true,
        phase_deadline: null,
        accused_player_id: "p1",
        players: [
          { player_id: "p1", nickname: "정글짐", is_alive: true },
          { player_id: "p2", nickname: "라이트", is_alive: true },
        ],
      },
      error: null,
    });
    vi.spyOn(client, "getMyView").mockResolvedValue({
      player_id: "p2",
      nickname: "라이트",
      is_alive: true,
      role: "citizen",
      assigned_score: 50,
      assigned_by: "preference",
      investigation_result: null,
    });

    render(<App />);
    expect(screen.getByText("정글짐님을 처형할까요?")).toBeInTheDocument();
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — `App`이 `FINAL_DEFENSE`/`EXECUTION_VOTE`에 대해 `null`을 렌더링함

- [ ] **Step 3: `App.tsx` 전체 교체**

`frontend/src/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { HomePage } from "./pages/HomePage";
import { WaitingRoomPage } from "./pages/WaitingRoomPage";
import { RoleRevealPage } from "./pages/RoleRevealPage";
import { DayPage } from "./pages/DayPage";
import { FinalDefensePage } from "./pages/FinalDefensePage";
import { ExecutionVotePage } from "./pages/ExecutionVotePage";
import { NightPage } from "./pages/NightPage";
import { ResultPage } from "./pages/ResultPage";
import { usePlayerSession } from "./hooks/usePlayerSession";
import { useRoomState } from "./hooks/useRoomState";
import { getMyView } from "./api/client";
import type { GamePhase, MyView } from "./api/types";

const ROLE_REVEALED_PHASES: GamePhase[] = [
  "ROLE_ASSIGNMENT",
  "DAY_DISCUSSION",
  "DAY_VOTE",
  "FINAL_DEFENSE",
  "EXECUTION_VOTE",
  "NIGHT_ACTION",
];

export function App() {
  const { session, setSession, clearSession } = usePlayerSession();
  const { state, error } = useRoomState(session?.roomId ?? null);
  const [myView, setMyView] = useState<MyView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !state) return;
    if (!ROLE_REVEALED_PHASES.includes(state.phase)) return;
    getMyView(session.roomId, session.playerId).then(setMyView);
  }, [session, state?.phase]);

  useEffect(() => {
    if (!error || !error.includes("404")) return;
    setNotice("이전 방을 찾을 수 없어요. 새로 시작해주세요.");
    clearSession();
  }, [error, clearSession]);

  const renderPage = () => {
    if (!session) {
      return <HomePage onJoined={setSession} notice={notice} />;
    }

    if (!state) {
      return <p>방 정보를 불러오는 중...</p>;
    }

    switch (state.phase) {
      case "WAITING_ROOM":
        return <WaitingRoomPage session={session} state={state} />;
      case "ROLE_ASSIGNMENT":
        return myView ? (
          <RoleRevealPage session={session} state={state} myView={myView} />
        ) : (
          <p>직업을 배정하는 중...</p>
        );
      case "DAY_DISCUSSION":
      case "DAY_VOTE":
        return <DayPage session={session} state={state} />;
      case "FINAL_DEFENSE":
        return <FinalDefensePage state={state} />;
      case "EXECUTION_VOTE":
        return <ExecutionVotePage session={session} state={state} />;
      case "NIGHT_ACTION":
        return myView ? (
          <NightPage session={session} state={state} myView={myView} />
        ) : (
          <p>밤이 되는 중...</p>
        );
      case "RESULT":
        return <ResultPage session={session} />;
      default:
        return null;
    }
  };

  return <div className="app-shell">{renderPage()}</div>;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: 전체 프론트엔드 스위트 + 타입 체크**

Run: `npx vitest run`
Expected: 모든 테스트 파일 PASS

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "feat: route FINAL_DEFENSE and EXECUTION_VOTE phases in App"
```

---

### Task 11: 수동 E2E 검증 (혼자 4탭 플레이)

**Files:**
- 없음 (코드 변경 없음, 검증 전용 태스크)

- [ ] **Step 1: 두 서버 실행**

Run: `C:\dev\miniproject\start.bat` (또는 각각 `uvicorn mafia_game.api.app:app --port 8000`과 `npm run dev` 수동 실행)

- [ ] **Step 2: 전체 백엔드/프론트엔드 테스트 스위트 마지막 확인**

Run: `python -m pytest tests -v`
Expected: 전체 PASS

Run: `cd frontend && npx vitest run && npx tsc --noEmit`
Expected: 전체 PASS, 타입 에러 없음

- [ ] **Step 3: 브라우저 탭 4개로 혼자 풀 플레이**

`http://localhost:5173`을 4개 탭에서 열고 각각 다른 닉네임으로 입장 (또는 "테스트용 나머지 인원 채우기" 사용 후 3개 탭만 열어도 됨) 하여 다음을 확인:

- 역할 확인 화면이 15초 카운트다운 후 자동으로 낮 토론으로 넘어가는지
- 낮 토론이 90초 카운트다운 후 자동으로 투표로 넘어가는지
- 낮 투표에서 지목 버튼을 누르면 해당 대상이 하이라이트되고, "투표 완료"를 눌러야 확정되는지, 완료 후에는 다른 사람으로 바꿀 수 없는지
- 생존자 전원이 "투표 완료"를 누르면 45초가 다 되기 전에도 즉시 최후변론으로 넘어가는지
- 최후변론이 30초 동안 유지된 뒤 자동으로 찬반투표로 넘어가는지
- 찬반투표에서 지목된 사람 본인에게는 투표 버튼이 보이지 않는지, 나머지 인원이 찬성/반대를 고르고 완료하면 즉시(또는 20초 후) 처형/생존이 결정되는지
- 밤 단계에서 마피아/경찰/의사가 능력을 다 쓰면 30초 전에도 즉시 낮으로 넘어가는지
- 게임이 끝나면 리포트 화면이 뜨고, "로비로 이동"을 누르면 같은 방 대기실로 돌아가 다시 시작할 수 있는지

- [ ] **Step 4: 문제 발견 시**

발견한 문제를 정리해서 보고한다 (이 태스크에서는 코드를 수정하지 않는다 — 별도 후속 수정으로 처리).

---

## Self-Review 결과

- **스펙 커버리지:** §3(타이머 아키텍처)→Task 2/3, §4(단계 흐름/타이머 길이/동률 규칙)→Task 1/2, §5(데이터 모델)→Task 1, §6(API)→Task 3, §7(프론트엔드)→Task 4~10, §8(테스트 계획)→각 태스크의 테스트 스텝 + Task 11. 누락 없음.
- **플레이스홀더 스캔:** "TBD"/"나중에"/"적절히 처리" 등의 표현 없음. 모든 스텝에 실행 가능한 전체 코드 포함.
- **타입/시그니처 일관성:** `useCountdown(deadlineSeconds: number | null): number`, `submitExecutionVote(roomId, voterId, verdict: ExecutionVerdict)`, `restartRoom(roomId)` 이름과 시그니처가 정의된 태스크(Task 4)와 사용하는 태스크(5~10) 전체에서 동일하게 유지됨을 확인함. 백엔드 `tick(room, now=None)`, `resolve_final_defense(room)`, `resolve_execution_vote(room)`, `restart_room(room)`도 정의(Task 2)와 사용(Task 3)에서 일치함.
