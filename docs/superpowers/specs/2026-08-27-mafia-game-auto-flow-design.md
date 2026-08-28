# 마피아 게임 자동 진행 플로우 설계 (최후변론/찬반투표/타이머)

## 1. 배경 및 목표

현재 게임은 각 단계(역할 확인 → 낮 토론 → 낮 투표 → 밤)를 방장이 "다음 단계로" 버튼을 눌러 수동으로 넘기는 구조다. 실제 오프라인 마피아 게임처럼 진행되려면:

- 토론/투표/변론/찬반투표 각 단계에 **시간 제한(카운트다운)** 이 있어야 하고
- 투표는 누구를 지목했는지 **화면에서 즉시 확인**할 수 있어야 하며
- 투표는 "마감" 버튼(방장 조작)이 아니라 각자 "투표 완료" 버튼을 눌러 확정하고, **전원이 완료하면 타이머가 남아 있어도 즉시 다음 단계로** 넘어가야 하고
- 낮 투표로 지목된 사람에게 **최후변론 시간**을 준 뒤, **처형할지 살릴지 찬반투표**를 한 번 더 거쳐야 하며
- 이 모든 진행을 방장의 수동 개입 없이 **서버가 사회자 역할을 자동으로 수행**해야 하고
- 게임 종료 후 리포트 화면에서 **같은 방으로 재시작**할 수 있어야 한다.

참고 앱: 마피아42 (오프라인 모임용 마피아 진행 보조 앱). 이 스펙은 마피아42의 일반적인 진행 관례(변론 후 찬반투표, 동률 시 생존)를 채택하되, 정확한 UI/문구를 그대로 복제하지 않고 이 프로젝트의 기존 디자인 시스템(심야 시민 회의)에 맞춰 재구성한다.

## 2. 범위

포함:
- 게임 상태 머신에 `FINAL_DEFENSE`, `EXECUTION_VOTE` 단계 추가
- 모든 단계(역할 확인/토론/투표/최후변론/찬반투표/밤)의 타이머 기반 자동 전환
- 투표 단계의 "지목 선택 하이라이트 + 완료 버튼" UX
- 방 재시작(`POST /restart`) 및 리포트 화면의 "로비로 이동" 버튼

제외 (이번 스펙 범위 아님):
- 실시간(WebSocket) 통신으로의 전환 — 기존 1초 폴링 구조 유지
- 페르소나 성향 데이터 수집/추출 로직 변경
- 4/5/6인 외 인원수 지원

## 3. 타이머 아키텍처

실시간 백그라운드 스레드나 asyncio 타이머는 도입하지 않는다. 기존에 이미 "서버에 실시간 타이머 없음, 클라이언트가 1초마다 상태를 폴링한다"는 MVP 원칙이 있으므로, 이를 그대로 활용하는 **지연 평가(lazy tick) 방식**을 쓴다.

- `Room.phase_deadline: float | None` — 현재 단계가 자동으로 끝나야 하는 시각(UTC epoch seconds).
- 각 단계 진입 시 상태 전이 함수가 `phase_deadline = time.time() + DURATION`을 설정한다.
- `GET /rooms/{id}/state` 핸들러는 매 호출 시작 시 `tick(room)`을 실행한다. `tick`은 다음을 확인한다:
  1. 현재 단계에 "전원 완료" 조건이 있고 충족되었는가 (예: 생존자 전원이 투표를 완료함) → 즉시 다음 단계로 전이
  2. `phase_deadline`이 지났는가 → 다음 단계로 강제 전이 (미완료 표는 기권으로 간주)
  3. 둘 다 아니면 아무것도 하지 않음
- 한 번의 `tick` 호출은 **최대 한 단계만** 전이시킨다. 다음 폴링(최대 1초 후)에서 다시 `tick`이 호출되므로, 새로 진입한 단계의 데드라인이 이미 지나 있지 않은 한 한 번에 여러 단계를 건너뛰지 않는다. (여러 단계를 순식간에 건너뛰는 유일한 경우는 "지목된 사람 없음 → 최후변론/찬반투표 생략하고 바로 밤"처럼 설계상 의도된 스킵뿐이다.)
- 프론트엔드는 `phase_deadline`을 받아 `deadline - Date.now()/1000`으로 남은 시간을 계산해 카운트다운을 표시한다. 서버 재시작 등으로 시계가 어긋나는 특수 상황은 이 프로젝트의 개발 단계 범위에서는 무시한다.

`POST /rooms/{id}/advance`는 테스트 및 내부 로직에서 재사용하기 위해 함수 형태로는 유지하되, 프론트엔드는 더 이상 이 엔드포인트를 호출하지 않는다.

## 4. 상태 머신 변경

### 4.1 새 `GamePhase` 값
```
WAITING_ROOM
ROLE_ASSIGNMENT
DAY_DISCUSSION
DAY_VOTE
FINAL_DEFENSE   (신규)
EXECUTION_VOTE  (신규)
NIGHT_ACTION
RESULT
```

### 4.2 전체 흐름

```
WAITING_ROOM
  → (전원 입장 + 성향 데이터 완료 + 방장이 "게임 시작") → ROLE_ASSIGNMENT

ROLE_ASSIGNMENT  (15초 타이머, 자동)
  → DAY_DISCUSSION

DAY_DISCUSSION  (90초 타이머, 자동)
  → DAY_VOTE

DAY_VOTE  (45초 타이머, 생존자 전원 "투표 완료" 시 조기 종료)
  → 득표자가 있으면: accused_player_id 설정 → FINAL_DEFENSE
  → 아무도 득표하지 않았으면(투표 0표): 바로 NIGHT_ACTION (사망자 없음)

FINAL_DEFENSE  (30초 타이머, 자동, 입력 없음)
  → EXECUTION_VOTE

EXECUTION_VOTE  (20초 타이머, 지목자 제외 생존자 전원 "찬반 완료" 시 조기 종료)
  → 찬성 > 반대: accused_player_id 사망 처리
  → 그 외 (반대 ≥ 찬성, 무투표 포함): 생존
  → 승리 조건 확인 → 충족 시 RESULT, 아니면 NIGHT_ACTION

NIGHT_ACTION  (30초 타이머, 생존한 마피아/경찰/의사 전원 능력 사용 시 조기 종료)
  → 밤 행동 처리 → 승리 조건 확인 → 충족 시 RESULT, 아니면 DAY_DISCUSSION (day_number += 1)

RESULT
  → (누구나) "로비로 이동" → WAITING_ROOM (같은 방, 인원/방장 유지, 나머지 초기화)
```

### 4.3 타이머 길이 (상수 모듈)

`mafia_game/game/timing.py`에 정의:

```python
ROLE_ASSIGNMENT_SECONDS = 15
DAY_DISCUSSION_SECONDS = 90
DAY_VOTE_SECONDS = 45
FINAL_DEFENSE_SECONDS = 30
EXECUTION_VOTE_SECONDS = 20
NIGHT_ACTION_SECONDS = 30
```

이 값들만 바꾸면 전체 타이밍이 조정되므로, 실제 오프라인 테스트 후 튜닝하기 쉽다.

### 4.4 동률/기권 처리 규칙 정리

- **낮 투표 동률**: 기존과 동일하게 무작위로 한 명을 지목자로 선정한다 (기존 `tally_votes` 로직 유지).
- **낮 투표에서 아무도 투표하지 않음**: 지목자 없음 → 최후변론/찬반투표 생략, 바로 밤으로.
- **찬반투표 동률 또는 무투표**: 생존 처리 (사용자 확정 사항).
- **밤 행동 미제출자**: 타이머 만료 시 해당 역할은 그냥 아무 행동도 하지 않은 것으로 처리 (기존 `resolve_night_actions`의 "행동 없음" 처리 경로를 그대로 사용).

## 5. 데이터 모델 변경 (`mafia_game/game/state.py`)

```python
@dataclass
class Room:
    ...
    phase_deadline: float | None = None
    accused_player_id: str | None = None
    votes_confirmed: set[str] = field(default_factory=set)
    execution_votes: dict[str, str] = field(default_factory=dict)   # voter_id -> "guilty" | "innocent"
    execution_confirmed: set[str] = field(default_factory=set)
```

`votes`(기존 낮 투표 dict)는 그대로 재사용한다. "완료" 여부만 `votes_confirmed`로 별도 추적한다.

## 6. API 변경

### 6.1 `GET /rooms/{id}/state`
- 응답 시작 전에 `tick(room)` 실행 (자동 전이 수행).
- 응답에 필드 추가: `phase_deadline: float | None`, `accused_player_id: str | None`.

### 6.2 `POST /rooms/{id}/vote` (동작 변경)
- 요청은 기존과 동일 `{voter_id, target_id}`.
- `DAY_VOTE` 단계에서만 허용.
- `voter_id`가 이미 `votes_confirmed`에 있으면 400 (`"이미 투표를 완료했습니다"`) — 완료 후 재변경 불가 원칙.
- 정상 처리 시 `votes[voter_id] = target_id`로 기록**과 동시에** `votes_confirmed.add(voter_id)`. 즉 이 엔드포인트 호출 자체가 "지목 + 완료"를 한 번에 의미한다. (프론트에서 대상 선택 자체는 로컬 상태로만 하이라이트하고, "투표 완료" 버튼을 눌렀을 때 이 API를 호출한다.)

### 6.3 `POST /rooms/{id}/execution-vote` (신규)
- 요청: `{voter_id: str, verdict: "guilty" | "innocent"}`
- `EXECUTION_VOTE` 단계에서만 허용.
- `voter_id == room.accused_player_id`면 400 (본인은 투표 불가).
- `voter_id`가 이미 `execution_confirmed`에 있으면 400.
- 정상 처리 시 `execution_votes[voter_id] = verdict`, `execution_confirmed.add(voter_id)`.

### 6.4 `POST /rooms/{id}/restart` (신규)
- `RESULT` 단계에서만 허용 (그 외 400).
- 효과: `phase = WAITING_ROOM`, `day_number = night_number = 0`, `votes = {}`, `votes_confirmed = set()`, `execution_votes = {}`, `execution_confirmed = set()`, `night_actions = {}`, `investigation_result = None`, `winner = None`, `accused_player_id = None`, `phase_deadline = None`, `personas = {}`.
- 각 `Player`의 `role`, `assigned_score`, `assigned_by`를 `None`으로, `is_alive`를 `True`로 리셋.
- `players`(닉네임 목록)와 `host_player_id`, `player_count`는 그대로 유지 — 같은 사람들이 대기실로 돌아간 것처럼 동작.

### 6.5 기존 `POST /rooms/{id}/advance`
- 함수/엔드포인트는 유지하되(테스트 및 내부 재사용), 프론트엔드 코드에서는 호출을 전부 제거한다.

## 7. 프론트엔드 변경

### 7.1 공통: `useCountdown(deadlineSeconds: number | null)`
- `state.phase_deadline`을 받아 매초 남은 초를 계산해 반환하는 훅. 남은 시간이 0 이하면 0으로 클램프.
- 각 페이지 상단에 "⏱ 남은 시간: N초" 형태로 표시.

### 7.2 `DayPage`
- `DAY_DISCUSSION`: 카운트다운만 표시, 호스트 전용 "투표 시작" 버튼 제거.
- `DAY_VOTE`: 대상 버튼 클릭 시 로컬 상태(`selectedTargetId`)로 하이라이트 클래스 적용 (서버 호출 없음). 하단 "투표 완료" 버튼은 `selectedTargetId`가 없으면 비활성. 클릭 시 `castVote(roomId, playerId, selectedTargetId)` 호출 → 성공하면 "투표를 완료했습니다. 다른 사람을 기다리는 중..." 문구로 전환하고 버튼 비활성화.
- 방장 전용 "투표 마감" 버튼 완전 제거 (자동 진행이므로 불필요).

### 7.3 `FinalDefensePage` (신규)
- `accused_player_id`에 해당하는 닉네임을 표시: "OOO님의 최후 변론 시간입니다"
- 카운트다운만 표시, 버튼 없음.

### 7.4 `ExecutionVotePage` (신규)
- 지목된 사람 본인에게는 "당신은 이번 투표에 참여할 수 없습니다" 안내와 카운트다운만 표시.
- 그 외 생존자: "찬성(처형)" / "반대(생존)" 두 버튼 → 클릭 시 로컬 하이라이트만 적용, 하단 "투표 완료" 버튼으로 `submitExecutionVote` 호출 후 대기 문구로 전환.

### 7.5 `RoleRevealPage`, `NightPage`
- 호스트 전용 수동 진행 버튼 제거, 카운트다운 표시로 교체.
- `NightPage`의 능력 제출 후 "다음 단계로" 버튼도 제거 — 제출 후에는 "능력을 사용했습니다. 아침을 기다려주세요." 문구 + 카운트다운만 남는다.

### 7.6 `ResultPage`
- 하단에 "로비로 이동" 버튼 추가. 클릭 시 `restartRoom(roomId)` 호출. 성공하면 다음 폴링에서 `state.phase`가 `WAITING_ROOM`으로 바뀌어 `App.tsx`가 자연스럽게 대기실 화면으로 전환한다 (별도 라우팅 처리 불필요).

### 7.7 `App.tsx`
- `GamePhase` 스위치문에 `FINAL_DEFENSE → FinalDefensePage`, `EXECUTION_VOTE → ExecutionVotePage` 케이스 추가.
- `ROLE_REVEALED_PHASES` 목록에 `FINAL_DEFENSE`, `EXECUTION_VOTE`도 추가 (역할 정보/조사 결과가 계속 필요하므로).

## 8. 테스트 계획

백엔드 (pytest, TDD로 먼저 작성):
- `timing.py` 상수 존재 확인은 별도 테스트 불필요 (다른 테스트에서 간접 검증).
- `state_machine`: `DAY_VOTE`에서 득표자가 있을 때 `FINAL_DEFENSE`로 전이하고 `accused_player_id`가 설정되는지, 득표자가 없을 때 바로 `NIGHT_ACTION`으로 가는지.
- `EXECUTION_VOTE` 처리: 찬성 다수 → 사망 + 다음 단계, 반대 다수/동률/무투표 → 생존 + 다음 단계.
- `tick()`: 데드라인 미도래 시 아무 변화 없음, 데드라인 도래 시 강제 전이, 전원 완료 시 데드라인 전이라도 조기 전이.
- API: `POST /vote` 중복 호출 시 400, `POST /execution-vote`에서 본인 투표 시도 시 400, `POST /restart`는 `RESULT`가 아닐 때 400이고 `RESULT`일 때 방을 올바르게 리셋하는지 (인원/방장 유지, 나머지 초기화).
- 전체 흐름 통합 테스트: 방 생성 → 인원/성향 채우기 → 게임 시작 → 토론 → 투표(전원 완료로 조기 종료) → 최후변론 → 찬반투표(사망 케이스) → 밤 → 결과 → 재시작 → 다시 `WAITING_ROOM`인지 확인. 시간 흐름은 `time.time()`을 모킹하거나 `phase_deadline`을 과거로 직접 세팅해 데드라인 만료 경로도 별도로 검증한다.

프론트엔드 (vitest + testing-library):
- `useCountdown` 훅 단위 테스트.
- `DayPage` 투표: 대상 클릭 시 하이라이트, "투표 완료" 클릭 시 API 호출 및 이후 버튼 비활성.
- `FinalDefensePage`, `ExecutionVotePage` 렌더링 및 완료 버튼 동작.
- `ResultPage`의 "로비로 이동" 클릭 시 `restartRoom` 호출.
- `App.tsx`에 새 phase 라우팅 케이스 추가 확인.

수동 E2E 체크리스트 (기존 문서에 추가):
- `start.bat`으로 서버 두 개 실행 → 4개 탭으로 혼자 풀 플레이 진행 → 각 단계 카운트다운이 실제로 줄어드는지, 전원 완료 시 타이머보다 먼저 넘어가는지, 타이머 만료 시 자동으로 넘어가는지, 최후변론/찬반투표가 올바르게 나오는지, 결과 화면에서 로비로 이동 후 재시작이 되는지 확인.

## 9. 리스크 및 트레이드오프

- **1초 폴링 지연**: 전원이 "완료"를 눌러도 최대 1초 뒤에나 다음 단계로 넘어간다. 오프라인 모임 진행 속도에는 문제없는 수준으로 판단해 허용한다.
- **클라이언트 시계 오차**: `phase_deadline`은 서버 절대 시각 기준이므로, 사용자 기기 시계가 심하게 어긋나면 카운트다운이 부정확할 수 있다. 로컬 개발/모임용 MVP이므로 별도 시계 동기화 로직은 도입하지 않는다.
- **기권 처리**: 타이머 만료 시 미완료자는 기권으로 간주된다 (투표 안 한 것으로, 밤 능력은 미사용으로). 이는 실제 오프라인 진행 관례와 일치한다.
