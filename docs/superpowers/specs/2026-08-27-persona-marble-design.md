# 페르소나 마블 (Persona Marble) 모듈 설계

## 1. 배경 및 목표

6인 팀 미니프로젝트의 두 번째 미니게임으로, "성향 기반 1대1 연인 보드게임" 모듈을 만든다.
실제 페르소나 데이터 연동은 다른 팀원이 담당하므로, 이 모듈은 **어댑터 패턴**으로 데이터
출처(실제 API vs 목업)와 게임 로직을 분리해, 지금은 목업 데이터로 완결된 상태로 동작·테스트
가능하고, 나중에는 어댑터 구현체 교체만으로 실제 데이터에 연결되는 독립 모듈로 만든다.

이 저장소에는 이미 별개의 "마피아 게임" 미니게임(Python 백엔드 + React 프론트엔드,
`mafia_game/persona/provider.py`에 동일한 어댑터 패턴 선례가 있음)이 구현되어 있다. 페르소나
마블은 그와 완전히 독립된 두 번째 프론트엔드 전용 모듈이며, 이번 스펙에서는 마피아 게임 코드를
전혀 수정하지 않는다.

## 2. 범위

포함:
- `frontend/src/personaMarble/` 아래 프론트엔드 전용 모듈 (React + TypeScript, 기존 프로젝트
  스택 그대로 사용, Tailwind 신규 도입 없이 CSS 변수 기반 커스텀 스타일)
- 페르소나 타입/어댑터 인터페이스 + 목업 어댑터 구현
- 보드 생성 알고리즘, 퀴즈 생성 알고리즘, 케미 총평 생성 유틸
- `useReducer` 기반 게임 상태 머신 (ROLL_DICE / SHOW_QUIZ / SUBMIT_ANSWER / GAME_OVER)
- 12칸 보드 UI, 주사위, 턴/점수 대시보드, 퀴즈 모달, 종료 화면
- 데모 전용 목업 데이터 스위치 (프리셋 3종 순환, 보드 타일 비율 재구성 검증용)
- 별도 데모 진입점 (`frontend/marble.html`), 기존 마피아 게임 라우팅에는 통합하지 않음
- Vitest + Testing Library 기반 유닛 테스트

제외 (이번 스펙 범위 아님):
- 실제 페르소나 데이터 연동 (다른 팀원 담당, 어댑터 교체 지점만 남겨둠)
- 마피아 게임과의 실제 통합 라우팅/네비게이션 (팀 병합 시 별도 작업)
- 백엔드/서버 API (이 모듈은 100% 클라이언트 사이드로 동작)
- 프로덕션 멀티 엔트리 빌드 설정 (`vite.config.ts`의 `rollupOptions.input` 등록은 병합 시 처리)
- 사용자가 임의로 두 플레이어를 선택하는 UI (데모는 고정된 두 목업 페르소나로 진행)

## 3. 아키텍처

### 3.1 디렉터리 구조

```
frontend/
  marble.html                          # 데모 전용 HTML 진입점
  src/personaMarble/
    types/
      persona.ts        # PersonaStats, PersonaTraits, UserPersona, IPersonaAdapter
      game.ts            # TileType, GamePhase, Player, Tile, GameState, GameAction
    adapters/
      mockPersonaAdapter.ts   # MockPersonaAdapter implements IPersonaAdapter
    utils/
      boardGenerator.ts        # generateBoard(personaA, personaB): Tile[]
      quizGenerator.ts         # generateQuiz(targetPersona, tileType): Quiz
      chemistrySummary.ts      # summarizeChemistry(...): string
    state/
      gameReducer.ts            # useReducer 상태 머신 + 초기 상태 생성 함수
    components/
      Board.tsx / Tile.tsx / Dice.tsx / ScoreDashboard.tsx / QuizModal.tsx
      GameOverScreen.tsx / MockSwitchPanel.tsx
    PersonaMarbleApp.tsx        # 최상위 컴포넌트, 리듀서 조립
    personaMarble.css           # 전용 디자인 토큰 (마피아 게임과 다른 팔레트)
    main.tsx                    # 데모 진입점 (ReactDOM.createRoot)
```

기존 `frontend/src/App.tsx`, `main.tsx`, `index.html`, `styles.css`는 수정하지 않는다.

### 3.2 데이터 흐름과 어댑터 경계

- `IPersonaAdapter.getPersonaByUserId(userId): Promise<UserPersona>` 가 유일한 데이터 진입점.
  게임 로직(보드 생성기, 퀴즈 생성기, 리듀서, 모든 컴포넌트)은 이 인터페이스가 반환하는
  `UserPersona` 타입에만 의존하고, `MockPersonaAdapter`라는 구체 클래스를 알지 못한다.
- `PersonaMarbleApp.tsx`가 부팅 시 어댑터 인스턴스를 생성해 `adapter.getPersonaByUserId('user_a')`,
  `adapter.getPersonaByUserId('user_b')` 를 호출하고 결과를 리듀서 초기 상태로 넘긴다.
- 실제 데이터 연동 시 팀원은 `RealPersonaAdapter implements IPersonaAdapter`를 새로 작성해
  `PersonaMarbleApp.tsx`의 어댑터 생성 한 줄만 교체하면 된다. 해당 위치에
  `// TODO: API 연동 시 이 어댑터로 교체` 주석을 남긴다.
- `MockSwitchPanel`(데모 전용 컴포넌트)만 예외적으로 `MockPersonaAdapter`의 구체 메서드
  (인터페이스 밖의 `setPreset()`)를 직접 호출한다. 이 컴포넌트는 실제 연동 시 통째로 삭제될
  코드이므로 파일 상단에 `// TODO: API 연동 시 이 컴포넌트 및 사용처를 제거` 주석을 남긴다.

## 4. 타입 명세

### 4.1 `types/persona.ts`

사용자가 제공한 스펙을 그대로 채택한다:

```typescript
export interface PersonaStats {
  logic: number;
  empathy: number;
  drive: number;
  caution: number;
}

export interface PersonaTraits {
  stressRelief: string;
  conflictStyle: string;
  dateStyle: string;
  spontaneousAction: string;
}

export interface UserPersona {
  userId: string;
  nickname: string;
  stats: PersonaStats;
  traits: PersonaTraits;
}

export interface IPersonaAdapter {
  getPersonaByUserId(userId: string): Promise<UserPersona>;
}
```

### 4.2 `types/game.ts`

```typescript
export type TileType =
  | "START" | "LOGIC" | "EMPATHY" | "DRIVE" | "CAUTION"
  | "CHANCE" | "PENALTY";

export type PlayerId = "A" | "B";

export interface Tile {
  index: number;       // 0-11
  type: TileType;
}

export interface Quiz {
  tileType: TileType;
  traitKey: keyof PersonaTraits;
  question: string;
  choices: string[];     // 4개, 셔플됨
  correctIndex: number;
}

export type GamePhase =
  | "ROLL_DICE" | "SHOW_QUIZ" | "SUBMIT_ANSWER" | "GAME_OVER";

export interface PlayerState {
  id: PlayerId;
  persona: UserPersona;
  position: number;      // 0-11
  score: number;
}

export interface GameState {
  phase: GamePhase;
  board: Tile[];             // length 12
  players: Record<PlayerId, PlayerState>;
  currentPlayer: PlayerId;
  turnCount: number;         // 0-10, 양쪽 합산
  lastDiceRoll: number | null;
  activeQuiz: Quiz | null;
  activeTileType: TileType | null;
  lastAnswerCorrect: boolean | null;
  chemistrySummary: string | null;   // GAME_OVER 진입 시 채움
}

export type GameAction =
  | { type: "ROLL_DICE" }
  | { type: "SUBMIT_ANSWER"; choiceIndex: number }
  | { type: "REGENERATE_BOARD"; personaA: UserPersona; personaB: UserPersona };
```

## 5. 목업 어댑터

`adapters/mockPersonaAdapter.ts`는 사용자가 제공한 코드를 그대로 사용하되, 데모 스위치용으로
인터페이스 계약을 벗어나지 않는 범위에서 프리셋 전환 메서드를 추가한다.

- 기본 프리셋(요구사항의 "민수(분석형)/지은(공감형)")은 그대로 유지.
- 추가 프리셋 2종을 내부 상수 배열로 정의: "추진형 vs 신중형", "균형형 vs 균형형".
- `setPreset(index: number): void` — 다음 `getPersonaByUserId` 호출부터 반영될 활성 프리셋을
  변경한다. `IPersonaAdapter`에는 없는 메서드이므로, 실제 어댑터로 교체되면 자연히 사라진다.

## 6. 보드 생성 알고리즘 (`utils/boardGenerator.ts`)

```typescript
export function generateBoard(personaA: UserPersona, personaB: UserPersona): Tile[]
```

1. 인덱스 0 = `START` 고정.
2. 남은 11칸 중 `CHANCE` 2칸, `PENALTY` 1칸을 고정 배정 (총 3칸).
3. 나머지 8칸을 4개 성향 카테고리(LOGIC/EMPATHY/DRIVE/CAUTION)에 비례 배분한다.
   - 두 플레이어의 해당 stat을 합산해 가중치로 사용 (예: `logicWeight = a.stats.logic + b.stats.logic`).
   - 최대잔여법(Largest Remainder Method)으로 8칸을 정수 배분한다. 모든 가중치가 0인 극단적
     상황을 대비해 배분 전 각 가중치에 최소값 1을 더해 0으로 나누기/전량 쏠림을 방지한다.
4. 위 11칸(8 stat + 2 chance + 1 penalty)을 배열로 만든 뒤 Fisher-Yates로 셔플해 인덱스 1-11에
   배치한다.
5. 순수 함수로 작성 (외부 상태 의존 없음, 매 호출 시 `Math.random` 기반으로 셔플 결과만 달라짐)
   → 유닛 테스트에서는 비율 배분 로직과 셔플 로직을 분리해 배분 부분만 결정적으로 검증한다.

## 7. 퀴즈 생성 알고리즘 (`utils/quizGenerator.ts`)

```typescript
export function generateQuiz(targetPersona: UserPersona, tileType: TileType): Quiz
```

1. 타일 타입 → trait 필드 매핑:
   - `LOGIC → conflictStyle`, `EMPATHY → stressRelief`, `DRIVE → dateStyle`,
     `CAUTION → spontaneousAction`
   - `CHANCE` / `PENALTY` → 4개 trait 키 중 무작위 선택
   - `START`는 퀴즈를 발생시키지 않음 (리듀서에서 START 도착 시 즉시 다음 턴으로 넘김)
2. 정답 = `targetPersona.traits[traitKey]` (실제 값).
3. 오답 3개 = trait 키별로 미리 정의한 고정 오답 풀(각 6~8개 문구)에서, 정답과 문자열이
   겹치지 않게 무작위 3개 추출.
4. 4개 선택지를 셔플하고 `correctIndex`를 그에 맞게 계산.
5. `question` 문자열은 trait 키별 고정 질문 템플릿 사용 (예: `"${targetPersona.nickname}님이 갈등 상황에서 주로 보이는 태도는?"`).

## 8. 케미 총평 유틸 (`utils/chemistrySummary.ts`)

```typescript
export function summarizeChemistry(playerA: PlayerState, playerB: PlayerState): string
```

- 점수 차이가 작을수록("체급이 비슷함"), 4개 stat의 절대 차이 합이 작을수록("성향이 비슷함")
  등 규칙 기반으로 2~3개 코멘트 문구를 조합해 한 문단을 생성한다.
- 완전히 결정적인 규칙 함수 (랜덤 요소 없음) → 유닛 테스트로 스냅샷 검증 가능.

## 9. 게임 상태 머신 (`state/gameReducer.ts`)

`useReducer(gameReducer, initialState)` 로 구현. 화면 쪽 요구사항의 4단계 상태를
`GamePhase`로 표현한다.

- **ROLL_DICE**: 주사위 버튼 활성. `ROLL_DICE` 액션 → 1~3 무작위 이동값 산출 →
  `currentPlayer`의 `position`을 `(position + roll) % 12`로 갱신 → 도착 타일 확인.
  - 도착 타일이 `START`면 퀴즈 없이 바로 턴 종료 처리(턴 카운트 증가, 상대 플레이어로 교체,
    `turnCount === 10`이면 `GAME_OVER`로 전이하며 `chemistrySummary` 계산).
  - 그 외 타일이면 `generateQuiz`로 퀴즈를 만들어 `activeQuiz`에 저장하고 `SHOW_QUIZ`로 전이.
- **SHOW_QUIZ**: 퀴즈 모달 표시 중, 사용자 응답 대기.
- **SUBMIT_ANSWER** 액션 (choiceIndex 포함): 정답 여부 판정.
  - 일반 타일: 정답 +10 / 오답 0
  - `CHANCE`: 정답 +20 / 오답 0
  - `PENALTY`: 정답 +10 / **오답 -5**
  - 판정 결과를 `lastAnswerCorrect`에 저장하고 `SUBMIT_ANSWER` phase로 잠깐 전이해 UI가
    정답/오답 피드백을 보여줄 시간을 준 뒤, 턴 카운트 증가·플레이어 교체·(10턴 도달 시)
    `GAME_OVER` 전이는 `ROLL_DICE`와 동일한 공통 로직을 재사용한다.
- **GAME_OVER**: `chemistrySummary`와 최종 점수를 표시. 이 상태에서는 `ROLL_DICE` 액션을
  무시한다.
- **REGENERATE_BOARD** 액션: `MockSwitchPanel`이 프리셋을 바꿀 때 발행. 새 두 페르소나로
  `generateBoard`를 다시 실행하고, 점수/턴/포지션을 포함한 전체 게임 상태를 초기화한다.

턴 규칙: "총 10턴 제한"은 두 플레이어 합산 총 10턴(각 플레이어가 번갈아 5턴씩)으로 해석한다.
플레이어 A가 먼저 시작한다.

## 10. UI 컴포넌트

- **Board.tsx**: 12칸을 4×4 CSS Grid의 바깥 테두리에 배치(모서리 4칸 + 변 8칸), 중앙은
  현재 턴/주사위 결과 등 요약 정보를 보여주는 빈 공간으로 사용. 각 플레이어의 말(마커)을
  `position`에 따라 렌더링.
- **Tile.tsx**: 타일 타입별 아이콘/색상(팔레트에서 타입별 accent 컬러 지정).
- **Dice.tsx**: "주사위 굴리기" 버튼, `phase === "ROLL_DICE"`일 때만 활성화, 굴림 애니메이션은
  CSS 트랜지션으로 간단히 처리(주사위 숫자가 짧게 바뀌다 멈추는 정도).
- **ScoreDashboard.tsx**: 현재 턴(`turnCount`/10), 현재 차례 플레이어 하이라이트, 두 플레이어의
  점수를 하트 아이콘(예: 10점당 하트 1개, 소수점은 반쪽 하트 또는 숫자 병기)으로 표시.
- **QuizModal.tsx**: `activeQuiz` 렌더링, 4개 선택지 버튼, 선택 시 `SUBMIT_ANSWER` 디스패치.
  정답/오답 피드백을 잠깐 보여준 뒤 자동으로 닫히고 다음 턴으로 진행(약 1.2초 타이머).
- **GameOverScreen.tsx**: 최종 점수, 승자(또는 동점), `chemistrySummary` 문단 표시, "다시 하기"
  버튼(리듀서를 초기 상태로 리셋).
- **MockSwitchPanel.tsx**: "목업 데이터 스위치 (테스트용)" 버튼. 클릭 시
  `MockPersonaAdapter.setPreset()`으로 다음 프리셋으로 순환 + `REGENERATE_BOARD` 디스패치.
  현재 활성 프리셋 이름을 화면에 표시해 어떤 스탯 조합인지 알 수 있게 한다.
  `// TODO: API 연동 시 이 컴포넌트 및 사용처를 제거` 주석 포함.

## 11. 스타일

`personaMarble.css`에 이 모듈 전용 CSS 변수(팔레트, 폰트, spacing)를 정의한다. 기존
`styles.css`의 `:root` 변수와 이름이 겹치지 않도록 접두사(`--pm-*`)를 사용해 두 모듈을 같은
페이지에 우연히 함께 로드해도 충돌하지 않게 한다. 다만 이번 스펙에서는 두 모듈이 같은 페이지에
동시에 로드될 일이 없으므로(별도 `marble.html`), 이는 안전장치 성격이다.

## 12. 데모 진입점

- `frontend/marble.html`: `<div id="root">` + `<script type="module" src="/src/personaMarble/main.tsx">`.
- `src/personaMarble/main.tsx`: `ReactDOM.createRoot(...).render(<PersonaMarbleApp />)`.
- `vite dev` 서버는 별도 설정 없이도 프로젝트 루트의 모든 `.html` 파일을 경로 그대로 서빙하므로,
  `npm run dev` 후 `http://localhost:5173/marble.html`로 접근하면 된다.
- `npm run build`(프로덕션)는 기존과 동일하게 `index.html`만 빌드 대상으로 삼는다.
  `marble.html`을 빌드에 포함하려면 `vite.config.ts`의 `build.rollupOptions.input`에 두
  엔트리를 모두 등록해야 하며, 이는 팀 병합 시점에 처리할 사항으로 남겨둔다
  (`vite.config.ts`에 `// TODO: 병합 시 marble.html을 build.rollupOptions.input에 등록` 주석
  추가).

## 13. 테스트 계획

Vitest + Testing Library, 기존 프로젝트 컨벤션(콜로케이트된 `*.test.ts(x)`)을 따른다.

- `boardGenerator.test.ts`: 비율 배분이 가중치에 비례하는지(결정적 부분만), 항상 index 0이
  START인지, 항상 12칸이고 CHANCE 2/PENALTY 1이 포함되는지.
- `quizGenerator.test.ts`: 정답이 항상 choices에 포함되는지, 오답 3개가 정답과 겹치지 않는지,
  타일-트레잇 매핑이 올바른지.
- `chemistrySummary.test.ts`: 대표 케이스(점수 동점/큰 격차, 성향 유사/상반) 스냅샷.
- `gameReducer.test.ts`: ROLL_DICE→SHOW_QUIZ 전이, START 타일 스킵, SUBMIT_ANSWER 점수 계산
  (일반/CHANCE/PENALTY 각각 정답·오답), 10턴 도달 시 GAME_OVER 전이, REGENERATE_BOARD 리셋.
- `PersonaMarbleApp.test.tsx` 등 컴포넌트 테스트는 핵심 상호작용(주사위 굴리기 → 퀴즈 노출 →
  응답 → 점수 반영)에 대한 스모크 테스트 1~2개로 제한한다(로직은 이미 리듀서/유틸 단위 테스트로
  커버됨).

## 14. 미해결 사항 / 가정

- CHANCE 정답 +20, PENALTY 오답 -5 규칙과 "총 10턴 = 합산 5턴씩"은 사용자 승인 완료.
- 실제 어댑터 연동 시 필요한 인증/에러 핸들링(네트워크 실패 등)은 이 스펙 범위 밖이며,
  `RealPersonaAdapter` 작성자가 `IPersonaAdapter` 계약(Promise 반환) 안에서 자유롭게 처리한다.
