# Persona Marble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Persona Marble minigame — a 1-on-1 persona-compatibility board game — as a self-contained, professionally designed frontend module under `frontend/src/personaMarble/`, fully playable with mock data via an adapter pattern that swaps to real data later with zero game-logic changes.

**Architecture:** Pure-function game logic (board generation, quiz generation, chemistry summary) feeds a `useReducer` state machine; React components render from that state only. A single `IPersonaAdapter` interface is the only data boundary; `MockPersonaAdapter` is the sole implementation today. The module has its own HTML entry point (`marble.html`) and never touches the existing mafia-game files.

**Tech Stack:** React 18 + TypeScript (existing project deps, no new dependencies), Vite dev server multi-page support, Vitest + Testing Library, hand-written CSS with custom properties (no Tailwind).

**Spec:** `docs/superpowers/specs/2026-08-27-persona-marble-design.md`

## Global Constraints

- No new npm dependencies — use only what `frontend/package.json` already has.
- No edits to `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/index.html`, or `frontend/src/styles.css`.
- No edits to anything under `mafia_game/`.
- All new CSS custom properties are prefixed `--pm-`; all new CSS classes are prefixed `pm-`.
- Score rules: normal tile correct +10/incorrect 0; CHANCE correct +20/incorrect 0; PENALTY correct +10/incorrect -5.
- Total turns = 10, shared across both players (5 each), alternating, player A goes first.
- Tile→trait mapping: LOGIC→conflictStyle, EMPATHY→stressRelief, DRIVE→dateStyle, CAUTION→spontaneousAction; CHANCE/PENALTY pick a random trait.
- Board: 12 tiles, index 0 = START (fixed), 8 stat tiles allocated proportionally to combined `personaA+personaB` stats via largest-remainder method, 2 CHANCE + 1 PENALTY fixed, remaining 11 shuffled into indices 1–11.
- Every source file gets a colocated `*.test.ts`/`*.test.tsx` file, following the existing project's Vitest convention.

---

## File Structure

```
frontend/
  marble.html                                    [create]
  vite.config.ts                                 [modify — add TODO comment only]
  src/personaMarble/
    types/persona.ts                             [create]
    types/game.ts                                [create]
    adapters/mockPersonaAdapter.ts                [create]
    adapters/mockPersonaAdapter.test.ts           [create]
    utils/boardGenerator.ts                       [create]
    utils/boardGenerator.test.ts                  [create]
    utils/quizGenerator.ts                        [create]
    utils/quizGenerator.test.ts                   [create]
    utils/chemistrySummary.ts                     [create]
    utils/chemistrySummary.test.ts                [create]
    state/gameReducer.ts                          [create]
    state/gameReducer.test.ts                     [create]
    components/Tile.tsx                           [create]
    components/Board.tsx                          [create]
    components/Board.test.tsx                     [create]
    components/Dice.tsx                           [create]
    components/ScoreDashboard.tsx                 [create]
    components/ScoreDashboard.test.tsx             [create]
    components/QuizModal.tsx                      [create]
    components/QuizModal.test.tsx                 [create]
    components/GameOverScreen.tsx                 [create]
    components/GameOverScreen.test.tsx             [create]
    components/MockSwitchPanel.tsx                [create]
    PersonaMarbleApp.tsx                          [create]
    PersonaMarbleApp.test.tsx                     [create]
    personaMarble.css                             [create]
    main.tsx                                      [create]
```

---

### Task 1: Design tokens, CSS system, and demo entry point

**Files:**
- Create: `frontend/marble.html`
- Create: `frontend/src/personaMarble/personaMarble.css`
- Create: `frontend/src/personaMarble/main.tsx`
- Create: `frontend/src/personaMarble/PersonaMarbleApp.tsx` (placeholder shell, replaced fully in Task 13)

**Interfaces:**
- Produces: CSS classes consumed by every later component task — `pm-app`, `pm-shell`, `pm-card`, `pm-heading`, `pm-button`, `pm-button--primary`, `pm-button--ghost`, `pm-badge`, plus tile/board/dice/dashboard/modal/gameover/switch classes listed in their own tasks (defined here up front so later tasks don't touch this file).

- [ ] **Step 1: Create the HTML entry point**

`frontend/marble.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>페르소나 마블</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,600&family=Manrope:wght@400;500;600;700;800&family=Noto+Serif+KR:wght@500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/personaMarble/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Write the full design-token + layout CSS**

`frontend/src/personaMarble/personaMarble.css`:

```css
/* ===== Persona Marble design tokens — "월광 서약" (Moonlit Vow) ===== */
:root {
  --pm-bg: #1f0f1c;
  --pm-bg-vignette: #140a12;
  --pm-surface: #2c1528;
  --pm-surface-raised: #3a1d35;
  --pm-border: #4a2843;
  --pm-border-strong: #6b3a61;

  --pm-text: #f7ecf3;
  --pm-text-muted: #c9a8c0;
  --pm-text-faint: #8f6b87;

  --pm-accent: #e0a08a;
  --pm-accent-strong: #eab596;
  --pm-accent-ink: #2b1109;

  --pm-gold: #e8c468;
  --pm-heart: #e85d75;

  --pm-player-a: #e0a08a;
  --pm-player-b: #7fb3e8;

  --pm-logic-fg: #6f9ceb;
  --pm-logic-bg: #16233a;
  --pm-empathy-fg: #e87fa0;
  --pm-empathy-bg: #3a1c28;
  --pm-drive-fg: #f0965a;
  --pm-drive-bg: #3a2416;
  --pm-caution-fg: #6bbf9a;
  --pm-caution-bg: #16332a;
  --pm-chance-fg: #e8c468;
  --pm-chance-bg: #3a3016;
  --pm-penalty-fg: #d9554a;
  --pm-penalty-bg: #3a1613;
  --pm-start-fg: #eab596;
  --pm-start-bg: #3a2a30;

  --pm-success: #6fbf85;
  --pm-danger: #d9695c;

  --pm-font-display: "Playfair Display", "Noto Serif KR", ui-serif, serif;
  --pm-font-body: "Manrope", "Noto Sans KR", ui-sans-serif, system-ui, sans-serif;

  --pm-space-1: 4px;
  --pm-space-2: 8px;
  --pm-space-3: 12px;
  --pm-space-4: 16px;
  --pm-space-5: 24px;
  --pm-space-6: 32px;
  --pm-space-7: 48px;

  --pm-radius: 16px;
  --pm-radius-sm: 10px;
  --pm-radius-pill: 999px;

  --pm-shadow-card: 0 24px 60px -24px rgba(0, 0, 0, 0.65), 0 2px 0 rgba(255, 255, 255, 0.03) inset;
  --pm-shadow-pop: 0 16px 40px -16px rgba(0, 0, 0, 0.55);

  --pm-transition: 180ms cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: radial-gradient(circle at 50% -10%, var(--pm-bg-vignette), var(--pm-bg) 60%);
  color: var(--pm-text);
  font-family: var(--pm-font-body);
  min-height: 100vh;
}

.pm-app {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: var(--pm-space-6) var(--pm-space-4) var(--pm-space-7);
}

.pm-shell {
  width: 100%;
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: var(--pm-space-5);
}

.pm-heading {
  font-family: var(--pm-font-display);
  font-weight: 700;
  color: var(--pm-text);
  margin: 0;
  letter-spacing: 0.01em;
}

.pm-eyebrow {
  font-family: var(--pm-font-body);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--pm-accent-strong);
  margin: 0 0 var(--pm-space-2);
}

.pm-card {
  background: var(--pm-surface);
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-radius);
  box-shadow: var(--pm-shadow-card);
  padding: var(--pm-space-5);
}

.pm-button {
  font-family: var(--pm-font-body);
  font-weight: 700;
  font-size: 0.95rem;
  border-radius: var(--pm-radius-pill);
  border: 1px solid var(--pm-border-strong);
  background: var(--pm-surface-raised);
  color: var(--pm-text);
  padding: var(--pm-space-3) var(--pm-space-5);
  cursor: pointer;
  transition: transform var(--pm-transition), box-shadow var(--pm-transition), background var(--pm-transition);
}

.pm-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--pm-shadow-pop);
}

.pm-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pm-button--primary {
  background: linear-gradient(135deg, var(--pm-accent), var(--pm-accent-strong));
  color: var(--pm-accent-ink);
  border-color: transparent;
}

.pm-button--ghost {
  background: transparent;
}

.pm-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--pm-space-1);
  font-size: 0.78rem;
  font-weight: 700;
  padding: var(--pm-space-1) var(--pm-space-3);
  border-radius: var(--pm-radius-pill);
  background: var(--pm-surface-raised);
  border: 1px solid var(--pm-border);
  color: var(--pm-text-muted);
}

@media (max-width: 520px) {
  .pm-app {
    padding: var(--pm-space-4) var(--pm-space-3) var(--pm-space-6);
  }
  .pm-card {
    padding: var(--pm-space-4);
  }
}
```

- [ ] **Step 3: Create the demo entry point and placeholder app shell**

`frontend/src/personaMarble/PersonaMarbleApp.tsx` (temporary — full version lands in Task 13):

```tsx
import "./personaMarble.css";

export function PersonaMarbleApp() {
  return (
    <div className="pm-app">
      <div className="pm-shell">
        <p className="pm-eyebrow">Persona Marble</p>
        <h1 className="pm-heading">페르소나 마블 준비 중...</h1>
      </div>
    </div>
  );
}
```

`frontend/src/personaMarble/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { PersonaMarbleApp } from "./PersonaMarbleApp";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PersonaMarbleApp />
  </React.StrictMode>
);
```

- [ ] **Step 4: Add the deferred build-config TODO**

In `frontend/vite.config.ts`, add a one-line comment above the `export default defineConfig({` line (do not change any config values):

```ts
// TODO: 병합 시 marble.html을 build.rollupOptions.input에 등록 (현재는 dev 서버 전용)
export default defineConfig({
```

- [ ] **Step 5: Verify it renders**

Run: `cd frontend && npm run dev`
Open `http://localhost:5173/marble.html` in a browser and confirm the placeholder heading renders with the dark plum background and serif heading font (no console errors). Stop the dev server after confirming.

- [ ] **Step 6: Commit**

```bash
git add frontend/marble.html frontend/src/personaMarble/personaMarble.css frontend/src/personaMarble/main.tsx frontend/src/personaMarble/PersonaMarbleApp.tsx frontend/vite.config.ts
git commit -m "feat(persona-marble): scaffold demo entry point and design tokens"
```

---

### Task 2: Core types

**Files:**
- Create: `frontend/src/personaMarble/types/persona.ts`
- Create: `frontend/src/personaMarble/types/game.ts`

**Interfaces:**
- Produces: `PersonaStats`, `PersonaTraits`, `UserPersona`, `IPersonaAdapter` (from `types/persona.ts`); `TileType`, `PlayerId`, `Tile`, `Quiz`, `GamePhase`, `PlayerState`, `GameState`, `GameAction` (from `types/game.ts`) — every later task imports from these two files.

Types have no runtime behavior, so this task is verified by the TypeScript compiler rather than a test file.

- [ ] **Step 1: Write `types/persona.ts`**

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

- [ ] **Step 2: Write `types/game.ts`**

```typescript
import type { PersonaTraits, UserPersona } from "./persona";

export type TileType =
  | "START"
  | "LOGIC"
  | "EMPATHY"
  | "DRIVE"
  | "CAUTION"
  | "CHANCE"
  | "PENALTY";

export type PlayerId = "A" | "B";

export interface Tile {
  index: number;
  type: TileType;
}

export interface Quiz {
  tileType: TileType;
  traitKey: keyof PersonaTraits;
  question: string;
  choices: string[];
  correctIndex: number;
}

export type GamePhase = "ROLL_DICE" | "SHOW_QUIZ" | "SUBMIT_ANSWER" | "GAME_OVER";

export interface PlayerState {
  id: PlayerId;
  persona: UserPersona;
  position: number;
  score: number;
}

export interface GameState {
  phase: GamePhase;
  board: Tile[];
  players: Record<PlayerId, PlayerState>;
  currentPlayer: PlayerId;
  turnCount: number;
  lastDiceRoll: number | null;
  activeQuiz: Quiz | null;
  activeTileType: TileType | null;
  lastAnswerCorrect: boolean | null;
  chemistrySummary: string | null;
}

export type GameAction =
  | { type: "ROLL_DICE" }
  | { type: "SUBMIT_ANSWER"; choiceIndex: number }
  | { type: "ADVANCE_TURN" }
  | { type: "REGENERATE_BOARD"; personaA: UserPersona; personaB: UserPersona };
```

- [ ] **Step 3: Verify it compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: no errors (project has no other files importing these yet, so this only checks the two new files parse and type-check standalone — acceptable at this stage since nothing references them yet).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/personaMarble/types/persona.ts frontend/src/personaMarble/types/game.ts
git commit -m "feat(persona-marble): add persona and game type definitions"
```

---

### Task 3: Mock persona adapter

**Files:**
- Create: `frontend/src/personaMarble/adapters/mockPersonaAdapter.ts`
- Test: `frontend/src/personaMarble/adapters/mockPersonaAdapter.test.ts`

**Interfaces:**
- Consumes: `IPersonaAdapter`, `UserPersona` from `../types/persona`.
- Produces: `MockPersonaAdapter` class with `getPersonaByUserId(userId: string): Promise<UserPersona>` (interface method) and `setPreset(index: number): void` (mock-only, used later by `MockSwitchPanel`), plus exported `MOCK_PRESET_COUNT: number` and `MOCK_PRESET_LABELS: string[]` for the switch panel to display.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { MockPersonaAdapter, MOCK_PRESET_COUNT, MOCK_PRESET_LABELS } from "./mockPersonaAdapter";

describe("MockPersonaAdapter", () => {
  it("returns the analyst persona for user_a on the default preset", async () => {
    const adapter = new MockPersonaAdapter();
    const persona = await adapter.getPersonaByUserId("user_a");
    expect(persona.userId).toBe("user_a");
    expect(persona.nickname).toContain("민수");
    expect(persona.stats.logic).toBeGreaterThan(persona.stats.empathy);
  });

  it("returns the empathic persona for any other id on the default preset", async () => {
    const adapter = new MockPersonaAdapter();
    const persona = await adapter.getPersonaByUserId("user_b");
    expect(persona.nickname).toContain("지은");
    expect(persona.stats.empathy).toBeGreaterThan(persona.stats.logic);
  });

  it("switches persona pairs when setPreset is called", async () => {
    const adapter = new MockPersonaAdapter();
    const before = await adapter.getPersonaByUserId("user_a");
    adapter.setPreset(1);
    const after = await adapter.getPersonaByUserId("user_a");
    expect(after.nickname).not.toBe(before.nickname);
  });

  it("wraps preset index using modulo", async () => {
    const adapter = new MockPersonaAdapter();
    adapter.setPreset(MOCK_PRESET_COUNT);
    const wrapped = await adapter.getPersonaByUserId("user_a");
    adapter.setPreset(0);
    const first = await adapter.getPersonaByUserId("user_a");
    expect(wrapped.nickname).toBe(first.nickname);
  });

  it("exposes one label per preset", () => {
    expect(MOCK_PRESET_LABELS).toHaveLength(MOCK_PRESET_COUNT);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/personaMarble/adapters/mockPersonaAdapter.test.ts`
Expected: FAIL — `mockPersonaAdapter.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```typescript
import type { IPersonaAdapter, UserPersona } from "../types/persona";

interface PersonaPreset {
  label: string;
  a: Omit<UserPersona, "userId">;
  b: Omit<UserPersona, "userId">;
}

const PRESETS: PersonaPreset[] = [
  {
    label: "분석형 vs 공감형",
    a: {
      nickname: "민수(분석형)",
      stats: { logic: 85, empathy: 40, drive: 75, caution: 50 },
      traits: {
        stressRelief: "혼자 게임하거나 운동하기",
        conflictStyle: "논리적으로 잘잘못 따지기",
        dateStyle: "계획대로 착착 움직이는 데이트",
        spontaneousAction: "일단 이성적으로 원인 분석하기",
      },
    },
    b: {
      nickname: "지은(공감형)",
      stats: { logic: 30, empathy: 90, drive: 45, caution: 80 },
      traits: {
        stressRelief: "맛있는 음식 먹으며 수다 떨기",
        conflictStyle: "감정 가라앉을 때까지 기다려주기",
        dateStyle: "발길 닿는 대로 즉흥 데이트",
        spontaneousAction: "당황하지만 감정 공유하기",
      },
    },
  },
  {
    label: "추진형 vs 신중형",
    a: {
      nickname: "도현(추진형)",
      stats: { logic: 55, empathy: 45, drive: 92, caution: 20 },
      traits: {
        stressRelief: "바로 여행 계획부터 세우기",
        conflictStyle: "즉시 만나서 담판 짓기",
        dateStyle: "즉흥 액티비티 가득한 데이트",
        spontaneousAction: "일단 몸부터 움직이기",
      },
    },
    b: {
      nickname: "서아(신중형)",
      stats: { logic: 60, empathy: 55, drive: 25, caution: 88 },
      traits: {
        stressRelief: "혼자 조용히 산책하며 정리하기",
        conflictStyle: "충분히 생각한 뒤 조심스레 대화 시작",
        dateStyle: "미리 예약해둔 안정적인 코스 데이트",
        spontaneousAction: "일단 멈추고 상황부터 파악하기",
      },
    },
  },
  {
    label: "균형형 vs 균형형",
    a: {
      nickname: "하린(균형형A)",
      stats: { logic: 62, empathy: 60, drive: 58, caution: 55 },
      traits: {
        stressRelief: "친한 친구와 산책하며 대화하기",
        conflictStyle: "서로의 입장을 먼저 들어보기",
        dateStyle: "새로운 카페와 익숙한 산책로를 섞은 데이트",
        spontaneousAction: "잠깐 생각한 뒤 유연하게 대응하기",
      },
    },
    b: {
      nickname: "予안(균형형B)",
      stats: { logic: 58, empathy: 63, drive: 55, caution: 60 },
      traits: {
        stressRelief: "좋아하는 음악 들으며 혼자 시간 보내기",
        conflictStyle: "메모로 생각을 정리해 차분히 전달하기",
        dateStyle: "계획 반, 즉흥 반으로 채우는 데이트",
        spontaneousAction: "상대의 반응을 살피며 천천히 맞춰가기",
      },
    },
  },
];

export const MOCK_PRESET_COUNT = PRESETS.length;
export const MOCK_PRESET_LABELS = PRESETS.map((preset) => preset.label);

// TODO: API 연동 시 이 클래스 대신 IPersonaAdapter를 구현하는 RealPersonaAdapter로 교체
export class MockPersonaAdapter implements IPersonaAdapter {
  private presetIndex = 0;

  setPreset(index: number): void {
    this.presetIndex = ((index % PRESETS.length) + PRESETS.length) % PRESETS.length;
  }

  async getPersonaByUserId(userId: string): Promise<UserPersona> {
    const preset = PRESETS[this.presetIndex];
    const isUserA = userId === "user_a";
    const base = isUserA ? preset.a : preset.b;
    return { userId, ...base };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/personaMarble/adapters/mockPersonaAdapter.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/personaMarble/adapters/mockPersonaAdapter.ts frontend/src/personaMarble/adapters/mockPersonaAdapter.test.ts
git commit -m "feat(persona-marble): add mock persona adapter with 3 presets"
```

---

### Task 4: Board generator

**Files:**
- Create: `frontend/src/personaMarble/utils/boardGenerator.ts`
- Test: `frontend/src/personaMarble/utils/boardGenerator.test.ts`

**Interfaces:**
- Consumes: `UserPersona` from `../types/persona`; `Tile`, `TileType` from `../types/game`.
- Produces: `generateBoard(personaA, personaB): Tile[]` (used by `state/gameReducer.ts`), `allocateStatTileCounts(weights): Record<"logic"|"empathy"|"drive"|"caution", number>` (exported for direct testing).

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { allocateStatTileCounts, generateBoard } from "./boardGenerator";
import type { UserPersona } from "../types/persona";

function persona(overrides: Partial<UserPersona["stats"]>): UserPersona {
  return {
    userId: "u",
    nickname: "n",
    stats: { logic: 0, empathy: 0, drive: 0, caution: 0, ...overrides },
    traits: { stressRelief: "", conflictStyle: "", dateStyle: "", spontaneousAction: "" },
  };
}

describe("allocateStatTileCounts", () => {
  it("splits evenly when weights are equal", () => {
    const counts = allocateStatTileCounts({ logic: 0, empathy: 0, drive: 0, caution: 0 });
    expect(counts).toEqual({ logic: 2, empathy: 2, drive: 2, caution: 2 });
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(8);
  });

  it("gives all 8 slots to a single dominant category", () => {
    const counts = allocateStatTileCounts({ logic: 100, empathy: 0, drive: 0, caution: 0 });
    expect(counts).toEqual({ logic: 8, empathy: 0, drive: 0, caution: 0 });
  });

  it("always sums to 8 regardless of weight distribution", () => {
    const counts = allocateStatTileCounts({ logic: 37, empathy: 12, drive: 5, caution: 91 });
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(8);
  });
});

describe("generateBoard", () => {
  it("always has 12 tiles with index 0 as START", () => {
    const board = generateBoard(persona({}), persona({}));
    expect(board).toHaveLength(12);
    expect(board[0]).toEqual({ index: 0, type: "START" });
  });

  it("always contains exactly 2 CHANCE and 1 PENALTY tile", () => {
    const board = generateBoard(persona({ logic: 80 }), persona({ empathy: 60 }));
    expect(board.filter((t) => t.type === "CHANCE")).toHaveLength(2);
    expect(board.filter((t) => t.type === "PENALTY")).toHaveLength(1);
  });

  it("stat tile counts match the proportional allocation for the combined weights", () => {
    const a = persona({ logic: 80, empathy: 10, drive: 20, caution: 30 });
    const b = persona({ logic: 20, empathy: 10, drive: 20, caution: 30 });
    const board = generateBoard(a, b);
    const expected = allocateStatTileCounts({
      logic: a.stats.logic + b.stats.logic,
      empathy: a.stats.empathy + b.stats.empathy,
      drive: a.stats.drive + b.stats.drive,
      caution: a.stats.caution + b.stats.caution,
    });
    expect(board.filter((t) => t.type === "LOGIC")).toHaveLength(expected.logic);
    expect(board.filter((t) => t.type === "EMPATHY")).toHaveLength(expected.empathy);
    expect(board.filter((t) => t.type === "DRIVE")).toHaveLength(expected.drive);
    expect(board.filter((t) => t.type === "CAUTION")).toHaveLength(expected.caution);
  });

  it("assigns sequential indices 0-11", () => {
    const board = generateBoard(persona({}), persona({}));
    expect(board.map((t) => t.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/personaMarble/utils/boardGenerator.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```typescript
import type { UserPersona } from "../types/persona";
import type { Tile, TileType } from "../types/game";

type StatKey = "logic" | "empathy" | "drive" | "caution";

const STAT_KEYS: StatKey[] = ["logic", "empathy", "drive", "caution"];

const STAT_TILE_TYPES: Record<StatKey, TileType> = {
  logic: "LOGIC",
  empathy: "EMPATHY",
  drive: "DRIVE",
  caution: "CAUTION",
};

const STAT_TILE_COUNT = 8;

export function allocateStatTileCounts(weights: Record<StatKey, number>): Record<StatKey, number> {
  const adjusted = STAT_KEYS.map((key) => weights[key] + 1);
  const total = adjusted.reduce((a, b) => a + b, 0);

  const raw = adjusted.map((w) => (w / total) * STAT_TILE_COUNT);
  const floors = raw.map(Math.floor);
  const remainder = STAT_TILE_COUNT - floors.reduce((a, b) => a + b, 0);

  const remainderOrder = raw
    .map((value, i) => ({ i, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  const counts = [...floors];
  for (let i = 0; i < remainder; i++) {
    counts[remainderOrder[i].i] += 1;
  }

  const result = {} as Record<StatKey, number>;
  STAT_KEYS.forEach((key, i) => {
    result[key] = counts[i];
  });
  return result;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateBoard(personaA: UserPersona, personaB: UserPersona): Tile[] {
  const weights: Record<StatKey, number> = {
    logic: personaA.stats.logic + personaB.stats.logic,
    empathy: personaA.stats.empathy + personaB.stats.empathy,
    drive: personaA.stats.drive + personaB.stats.drive,
    caution: personaA.stats.caution + personaB.stats.caution,
  };

  const counts = allocateStatTileCounts(weights);

  const statTiles: TileType[] = [];
  STAT_KEYS.forEach((key) => {
    for (let i = 0; i < counts[key]; i++) {
      statTiles.push(STAT_TILE_TYPES[key]);
    }
  });

  const remainingTiles = shuffle([...statTiles, "CHANCE", "CHANCE", "PENALTY"] as TileType[]);

  const board: Tile[] = [{ index: 0, type: "START" }];
  remainingTiles.forEach((type, i) => {
    board.push({ index: i + 1, type });
  });

  return board;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/personaMarble/utils/boardGenerator.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/personaMarble/utils/boardGenerator.ts frontend/src/personaMarble/utils/boardGenerator.test.ts
git commit -m "feat(persona-marble): add proportional board generator"
```

---

### Task 5: Quiz generator

**Files:**
- Create: `frontend/src/personaMarble/utils/quizGenerator.ts`
- Test: `frontend/src/personaMarble/utils/quizGenerator.test.ts`

**Interfaces:**
- Consumes: `UserPersona`, `PersonaTraits` from `../types/persona`; `TileType`, `Quiz` from `../types/game`.
- Produces: `generateQuiz(targetPersona, tileType): Quiz`, used by `state/gameReducer.ts`.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { generateQuiz } from "./quizGenerator";
import type { UserPersona } from "../types/persona";

const persona: UserPersona = {
  userId: "user_a",
  nickname: "민수",
  stats: { logic: 85, empathy: 40, drive: 75, caution: 50 },
  traits: {
    stressRelief: "혼자 게임하거나 운동하기",
    conflictStyle: "논리적으로 잘잘못 따지기",
    dateStyle: "계획대로 착착 움직이는 데이트",
    spontaneousAction: "일단 이성적으로 원인 분석하기",
  },
};

const ALL_TRAIT_KEYS = ["stressRelief", "conflictStyle", "dateStyle", "spontaneousAction"] as const;

describe("generateQuiz", () => {
  it.each([
    ["LOGIC", "conflictStyle"],
    ["EMPATHY", "stressRelief"],
    ["DRIVE", "dateStyle"],
    ["CAUTION", "spontaneousAction"],
  ] as const)("maps %s tiles to the %s trait", (tileType, traitKey) => {
    const quiz = generateQuiz(persona, tileType);
    expect(quiz.traitKey).toBe(traitKey);
    expect(quiz.choices[quiz.correctIndex]).toBe(persona.traits[traitKey]);
  });

  it("picks one of the four traits for CHANCE tiles", () => {
    const quiz = generateQuiz(persona, "CHANCE");
    expect(ALL_TRAIT_KEYS).toContain(quiz.traitKey);
    expect(quiz.choices[quiz.correctIndex]).toBe(persona.traits[quiz.traitKey]);
  });

  it("picks one of the four traits for PENALTY tiles", () => {
    const quiz = generateQuiz(persona, "PENALTY");
    expect(ALL_TRAIT_KEYS).toContain(quiz.traitKey);
  });

  it("always produces exactly 4 unique choices", () => {
    const quiz = generateQuiz(persona, "LOGIC");
    expect(quiz.choices).toHaveLength(4);
    expect(new Set(quiz.choices).size).toBe(4);
  });

  it("includes the persona's nickname in the question text", () => {
    const quiz = generateQuiz(persona, "DRIVE");
    expect(quiz.question).toContain("민수");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/personaMarble/utils/quizGenerator.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```typescript
import type { PersonaTraits, UserPersona } from "../types/persona";
import type { Quiz, TileType } from "../types/game";

type TraitKey = keyof PersonaTraits;

const TILE_TRAIT_MAP: Partial<Record<TileType, TraitKey>> = {
  LOGIC: "conflictStyle",
  EMPATHY: "stressRelief",
  DRIVE: "dateStyle",
  CAUTION: "spontaneousAction",
};

const ALL_TRAIT_KEYS: TraitKey[] = ["stressRelief", "conflictStyle", "dateStyle", "spontaneousAction"];

const QUESTION_TEMPLATES: Record<TraitKey, (nickname: string) => string> = {
  stressRelief: (nickname) => `${nickname}님이 스트레스를 풀 때 가장 즐겨 하는 방법은?`,
  conflictStyle: (nickname) => `${nickname}님이 갈등 상황에서 주로 보이는 태도는?`,
  dateStyle: (nickname) => `${nickname}님이 가장 선호하는 데이트 스타일은?`,
  spontaneousAction: (nickname) => `${nickname}님이 갑작스러운 돌발 상황에서 보이는 반응은?`,
};

const DISTRACTOR_POOL: Record<TraitKey, string[]> = {
  stressRelief: [
    "매운 음식으로 스트레스 날리기",
    "혼자 방 정리하며 마음 비우기",
    "밤새 드라이브하며 머리 식히기",
    "친구들 불러 모아 왁자지껄 놀기",
    "이불 속에서 아무것도 안 하기",
    "노래방에서 목청껏 소리 지르기",
  ],
  conflictStyle: [
    "일단 말을 아끼고 시간을 두기",
    "바로 사과부터 하고 보기",
    "제3자에게 중재를 부탁하기",
    "편지나 메시지로 마음 정리해 전달하기",
    "차분히 원인을 목록으로 정리하기",
    "농담으로 분위기부터 풀기",
  ],
  dateStyle: [
    "집에서 함께 요리하는 데이트",
    "미술관·전시 투어 데이트",
    "액티비티 가득한 야외 데이트",
    "밤바다 드라이브 데이트",
    "취미 클래스 함께 듣는 데이트",
    "동네 산책하며 수다 떠는 데이트",
  ],
  spontaneousAction: [
    "일단 크게 웃어넘기기",
    "재빨리 대안을 찾아 움직이기",
    "말없이 지켜보며 상황 파악하기",
    "주변 사람들에게 먼저 물어보기",
    "메모부터 남기고 침착하게 대응하기",
    "농담부터 던지고 보기",
  ],
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickTraitKey(tileType: TileType): TraitKey {
  const mapped = TILE_TRAIT_MAP[tileType];
  if (mapped) return mapped;
  return ALL_TRAIT_KEYS[Math.floor(Math.random() * ALL_TRAIT_KEYS.length)];
}

export function generateQuiz(targetPersona: UserPersona, tileType: TileType): Quiz {
  const traitKey = pickTraitKey(tileType);
  const correctAnswer = targetPersona.traits[traitKey];

  const pool = DISTRACTOR_POOL[traitKey].filter((d) => d !== correctAnswer);
  const distractors = shuffle(pool).slice(0, 3);

  const choices = shuffle([correctAnswer, ...distractors]);
  const correctIndex = choices.indexOf(correctAnswer);

  return {
    tileType,
    traitKey,
    question: QUESTION_TEMPLATES[traitKey](targetPersona.nickname),
    choices,
    correctIndex,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/personaMarble/utils/quizGenerator.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/personaMarble/utils/quizGenerator.ts frontend/src/personaMarble/utils/quizGenerator.test.ts
git commit -m "feat(persona-marble): add quiz generator with trait mapping"
```

---

### Task 6: Chemistry summary

**Files:**
- Create: `frontend/src/personaMarble/utils/chemistrySummary.ts`
- Test: `frontend/src/personaMarble/utils/chemistrySummary.test.ts`

**Interfaces:**
- Consumes: `PlayerState` from `../types/game`.
- Produces: `summarizeChemistry(playerA, playerB): string`, used by `state/gameReducer.ts`.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { summarizeChemistry } from "./chemistrySummary";
import type { PlayerState } from "../types/game";

function player(id: "A" | "B", nickname: string, score: number, stats: PlayerState["persona"]["stats"]): PlayerState {
  return {
    id,
    score,
    position: 0,
    persona: {
      userId: id,
      nickname,
      stats,
      traits: { stressRelief: "", conflictStyle: "", dateStyle: "", spontaneousAction: "" },
    },
  };
}

describe("summarizeChemistry", () => {
  it("calls out a near-tie score as well-matched understanding", () => {
    const a = player("A", "민수", 40, { logic: 50, empathy: 50, drive: 50, caution: 50 });
    const b = player("B", "지은", 45, { logic: 50, empathy: 50, drive: 50, caution: 50 });
    const summary = summarizeChemistry(a, b);
    expect(summary).toContain("민수");
    expect(summary).toContain("지은");
    expect(summary).toContain("대등한 점수");
  });

  it("names the higher scorer when the gap is large", () => {
    const a = player("A", "민수", 90, { logic: 50, empathy: 50, drive: 50, caution: 50 });
    const b = player("B", "지은", 10, { logic: 50, empathy: 50, drive: 50, caution: 50 });
    const summary = summarizeChemistry(a, b);
    expect(summary).toContain("민수님이 지은님보다");
  });

  it("describes similar stats as compatible chemistry", () => {
    const a = player("A", "민수", 50, { logic: 60, empathy: 55, drive: 50, caution: 50 });
    const b = player("B", "지은", 50, { logic: 55, empathy: 60, drive: 55, caution: 45 });
    const summary = summarizeChemistry(a, b);
    expect(summary).toContain("대화가 잘 통하는 케미");
  });

  it("describes very different stats as contrasting chemistry", () => {
    const a = player("A", "민수", 50, { logic: 95, empathy: 10, drive: 90, caution: 5 });
    const b = player("B", "지은", 50, { logic: 5, empathy: 90, drive: 10, caution: 95 });
    const summary = summarizeChemistry(a, b);
    expect(summary).toContain("대조적");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/personaMarble/utils/chemistrySummary.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```typescript
import type { PlayerState } from "../types/game";

const STAT_KEYS = ["logic", "empathy", "drive", "caution"] as const;

export function summarizeChemistry(playerA: PlayerState, playerB: PlayerState): string {
  const scoreDiff = Math.abs(playerA.score - playerB.score);
  const statDiff = STAT_KEYS.reduce(
    (sum, key) => sum + Math.abs(playerA.persona.stats[key] - playerB.persona.stats[key]),
    0
  );

  const parts: string[] = [];

  if (scoreDiff <= 10) {
    parts.push(
      `${playerA.persona.nickname}님과 ${playerB.persona.nickname}님은 이번 게임에서 거의 대등한 점수를 기록했어요, 서로를 잘 이해하고 있다는 신호예요.`
    );
  } else {
    const leader = playerA.score >= playerB.score ? playerA : playerB;
    const follower = leader === playerA ? playerB : playerA;
    parts.push(`${leader.persona.nickname}님이 ${follower.persona.nickname}님보다 상대방의 성향을 더 정확히 맞혔어요.`);
  }

  if (statDiff <= 60) {
    parts.push("두 분의 성향 수치도 전반적으로 비슷한 편이라, 대화가 잘 통하는 케미로 보여요.");
  } else if (statDiff <= 120) {
    parts.push("두 분은 서로 다른 면을 가진 만큼, 함께 있을 때 서로를 보완해줄 수 있는 케미예요.");
  } else {
    parts.push("두 분은 성향이 꽤 대조적이라, 서로에게 새로운 자극이 되어주는 케미예요.");
  }

  return parts.join(" ");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/personaMarble/utils/chemistrySummary.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/personaMarble/utils/chemistrySummary.ts frontend/src/personaMarble/utils/chemistrySummary.test.ts
git commit -m "feat(persona-marble): add chemistry summary generator"
```

---

### Task 7: Game state machine (reducer)

**Files:**
- Create: `frontend/src/personaMarble/state/gameReducer.ts`
- Test: `frontend/src/personaMarble/state/gameReducer.test.ts`

**Interfaces:**
- Consumes: `generateBoard` from `../utils/boardGenerator`; `generateQuiz` from `../utils/quizGenerator`; `summarizeChemistry` from `../utils/chemistrySummary`; `GameState`, `GameAction`, `PlayerId`, `Tile` from `../types/game`; `UserPersona` from `../types/persona`.
- Produces: `createInitialState(personaA, personaB): GameState`, `gameReducer(state, action): GameState` — both consumed by `PersonaMarbleApp.tsx` (Task 13) and by every component that needs a `GameState` fixture in its own tests.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it, vi, afterEach } from "vitest";
import { createInitialState, gameReducer } from "./gameReducer";
import type { GameState, Tile } from "../types/game";
import type { UserPersona } from "../types/persona";

function persona(id: string, nickname: string): UserPersona {
  return {
    userId: id,
    nickname,
    stats: { logic: 50, empathy: 50, drive: 50, caution: 50 },
    traits: {
      stressRelief: "rest",
      conflictStyle: "talk",
      dateStyle: "walk",
      spontaneousAction: "laugh",
    },
  };
}

const PERSONA_A = persona("user_a", "민수");
const PERSONA_B = persona("user_b", "지은");

function fixedBoard(types: Tile["type"][]): Tile[] {
  return types.map((type, index) => ({ index, type }));
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialState(PERSONA_A, PERSONA_B),
    board: fixedBoard(["START", "LOGIC", "LOGIC", "LOGIC", "PENALTY", "LOGIC", "LOGIC", "LOGIC", "LOGIC", "CHANCE", "CHANCE", "LOGIC"]),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createInitialState", () => {
  it("starts player A at position 0 with score 0 on a 12-tile board", () => {
    const state = createInitialState(PERSONA_A, PERSONA_B);
    expect(state.phase).toBe("ROLL_DICE");
    expect(state.currentPlayer).toBe("A");
    expect(state.turnCount).toBe(0);
    expect(state.board).toHaveLength(12);
    expect(state.players.A.position).toBe(0);
    expect(state.players.B.score).toBe(0);
  });
});

describe("gameReducer ROLL_DICE", () => {
  it("moves the current player and opens a quiz when landing on a non-START tile", () => {
    const state = baseState();
    vi.spyOn(Math, "random").mockReturnValue(0); // roll = 1 -> lands on index 1 (LOGIC)
    const next = gameReducer(state, { type: "ROLL_DICE" });

    expect(next.players.A.position).toBe(1);
    expect(next.phase).toBe("SHOW_QUIZ");
    expect(next.activeTileType).toBe("LOGIC");
    expect(next.activeQuiz).not.toBeNull();
  });

  it("skips the quiz and advances the turn immediately when landing on START", () => {
    const state = baseState({
      players: {
        ...baseState().players,
        A: { ...baseState().players.A, position: 11 },
      },
    });
    vi.spyOn(Math, "random").mockReturnValue(0); // roll = 1 -> position (11+1)%12 = 0 -> START
    const next = gameReducer(state, { type: "ROLL_DICE" });

    expect(next.players.A.position).toBe(0);
    expect(next.activeQuiz).toBeNull();
    expect(next.currentPlayer).toBe("B");
    expect(next.turnCount).toBe(1);
    expect(next.phase).toBe("ROLL_DICE");
  });

  it("is ignored outside the ROLL_DICE phase", () => {
    const state = baseState({ phase: "SHOW_QUIZ" });
    const next = gameReducer(state, { type: "ROLL_DICE" });
    expect(next).toBe(state);
  });
});

describe("gameReducer SUBMIT_ANSWER", () => {
  it("awards +10 for a correct answer on a normal tile", () => {
    const state = baseState({
      phase: "SHOW_QUIZ",
      activeTileType: "LOGIC",
      activeQuiz: { tileType: "LOGIC", traitKey: "conflictStyle", question: "q", choices: ["a", "b", "c", "d"], correctIndex: 2 },
    });
    const next = gameReducer(state, { type: "SUBMIT_ANSWER", choiceIndex: 2 });
    expect(next.players.A.score).toBe(10);
    expect(next.lastAnswerCorrect).toBe(true);
    expect(next.phase).toBe("SUBMIT_ANSWER");
  });

  it("awards +20 for a correct answer on a CHANCE tile", () => {
    const state = baseState({
      phase: "SHOW_QUIZ",
      activeTileType: "CHANCE",
      activeQuiz: { tileType: "CHANCE", traitKey: "conflictStyle", question: "q", choices: ["a", "b", "c", "d"], correctIndex: 0 },
    });
    const next = gameReducer(state, { type: "SUBMIT_ANSWER", choiceIndex: 0 });
    expect(next.players.A.score).toBe(20);
  });

  it("subtracts 5 for a wrong answer on a PENALTY tile", () => {
    const state = baseState({
      phase: "SHOW_QUIZ",
      activeTileType: "PENALTY",
      activeQuiz: { tileType: "PENALTY", traitKey: "conflictStyle", question: "q", choices: ["a", "b", "c", "d"], correctIndex: 0 },
    });
    const next = gameReducer(state, { type: "SUBMIT_ANSWER", choiceIndex: 1 });
    expect(next.players.A.score).toBe(-5);
    expect(next.lastAnswerCorrect).toBe(false);
  });

  it("does not award points for a wrong answer on a normal tile", () => {
    const state = baseState({
      phase: "SHOW_QUIZ",
      activeTileType: "LOGIC",
      activeQuiz: { tileType: "LOGIC", traitKey: "conflictStyle", question: "q", choices: ["a", "b", "c", "d"], correctIndex: 0 },
    });
    const next = gameReducer(state, { type: "SUBMIT_ANSWER", choiceIndex: 3 });
    expect(next.players.A.score).toBe(0);
  });
});

describe("gameReducer ADVANCE_TURN", () => {
  it("switches to the other player and returns to ROLL_DICE before the last turn", () => {
    const state = baseState({ phase: "SUBMIT_ANSWER", turnCount: 3, currentPlayer: "A" });
    const next = gameReducer(state, { type: "ADVANCE_TURN" });
    expect(next.turnCount).toBe(4);
    expect(next.currentPlayer).toBe("B");
    expect(next.phase).toBe("ROLL_DICE");
  });

  it("ends the game with a chemistry summary once turnCount reaches 10", () => {
    const state = baseState({ phase: "SUBMIT_ANSWER", turnCount: 9 });
    const next = gameReducer(state, { type: "ADVANCE_TURN" });
    expect(next.turnCount).toBe(10);
    expect(next.phase).toBe("GAME_OVER");
    expect(next.chemistrySummary).toBeTruthy();
  });

  it("is ignored outside the SUBMIT_ANSWER phase", () => {
    const state = baseState({ phase: "ROLL_DICE" });
    const next = gameReducer(state, { type: "ADVANCE_TURN" });
    expect(next).toBe(state);
  });
});

describe("gameReducer REGENERATE_BOARD", () => {
  it("resets scores, positions, and turn count with a fresh board", () => {
    const state = baseState({ turnCount: 6 });
    state.players.A.score = 40;
    const next = gameReducer(state, { type: "REGENERATE_BOARD", personaA: PERSONA_A, personaB: PERSONA_B });
    expect(next.turnCount).toBe(0);
    expect(next.players.A.score).toBe(0);
    expect(next.players.A.position).toBe(0);
    expect(next.board).toHaveLength(12);
    expect(next.phase).toBe("ROLL_DICE");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/personaMarble/state/gameReducer.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```typescript
import type { GameAction, GameState, PlayerId, Tile } from "../types/game";
import type { UserPersona } from "../types/persona";
import { generateBoard } from "../utils/boardGenerator";
import { generateQuiz } from "../utils/quizGenerator";
import { summarizeChemistry } from "../utils/chemistrySummary";

const TOTAL_TURNS = 10;

function otherPlayer(id: PlayerId): PlayerId {
  return id === "A" ? "B" : "A";
}

function scoreDelta(tileType: Tile["type"], isCorrect: boolean): number {
  if (tileType === "CHANCE") return isCorrect ? 20 : 0;
  if (tileType === "PENALTY") return isCorrect ? 10 : -5;
  return isCorrect ? 10 : 0;
}

function advanceTurn(state: GameState): GameState {
  const nextTurnCount = state.turnCount + 1;

  if (nextTurnCount >= TOTAL_TURNS) {
    return {
      ...state,
      phase: "GAME_OVER",
      turnCount: nextTurnCount,
      activeQuiz: null,
      activeTileType: null,
      lastAnswerCorrect: null,
      chemistrySummary: summarizeChemistry(state.players.A, state.players.B),
    };
  }

  return {
    ...state,
    phase: "ROLL_DICE",
    turnCount: nextTurnCount,
    currentPlayer: otherPlayer(state.currentPlayer),
    lastDiceRoll: null,
    activeQuiz: null,
    activeTileType: null,
    lastAnswerCorrect: null,
  };
}

export function createInitialState(personaA: UserPersona, personaB: UserPersona): GameState {
  const board = generateBoard(personaA, personaB);
  return {
    phase: "ROLL_DICE",
    board,
    players: {
      A: { id: "A", persona: personaA, position: 0, score: 0 },
      B: { id: "B", persona: personaB, position: 0, score: 0 },
    },
    currentPlayer: "A",
    turnCount: 0,
    lastDiceRoll: null,
    activeQuiz: null,
    activeTileType: null,
    lastAnswerCorrect: null,
    chemistrySummary: null,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ROLL_DICE": {
      if (state.phase !== "ROLL_DICE") return state;

      const roll = Math.floor(Math.random() * 3) + 1;
      const mover = state.players[state.currentPlayer];
      const newPosition = (mover.position + roll) % state.board.length;
      const tile = state.board[newPosition];

      const movedState: GameState = {
        ...state,
        lastDiceRoll: roll,
        players: {
          ...state.players,
          [state.currentPlayer]: { ...mover, position: newPosition },
        },
      };

      if (tile.type === "START") {
        return advanceTurn(movedState);
      }

      const opponent = state.players[otherPlayer(state.currentPlayer)];
      const quiz = generateQuiz(opponent.persona, tile.type);

      return {
        ...movedState,
        phase: "SHOW_QUIZ",
        activeQuiz: quiz,
        activeTileType: tile.type,
      };
    }

    case "SUBMIT_ANSWER": {
      if (state.phase !== "SHOW_QUIZ" || !state.activeQuiz || !state.activeTileType) {
        return state;
      }

      const isCorrect = action.choiceIndex === state.activeQuiz.correctIndex;
      const delta = scoreDelta(state.activeTileType, isCorrect);
      const scorer = state.players[state.currentPlayer];

      return {
        ...state,
        phase: "SUBMIT_ANSWER",
        lastAnswerCorrect: isCorrect,
        players: {
          ...state.players,
          [state.currentPlayer]: { ...scorer, score: scorer.score + delta },
        },
      };
    }

    case "ADVANCE_TURN": {
      if (state.phase !== "SUBMIT_ANSWER") return state;
      return advanceTurn(state);
    }

    case "REGENERATE_BOARD": {
      return createInitialState(action.personaA, action.personaB);
    }

    default:
      return state;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/personaMarble/state/gameReducer.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/personaMarble/state/gameReducer.ts frontend/src/personaMarble/state/gameReducer.test.ts
git commit -m "feat(persona-marble): add game state machine reducer"
```

---

### Task 8: Tile and Board components

**Files:**
- Create: `frontend/src/personaMarble/components/Tile.tsx`
- Create: `frontend/src/personaMarble/components/Board.tsx`
- Test: `frontend/src/personaMarble/components/Board.test.tsx`
- Modify: `frontend/src/personaMarble/personaMarble.css` (append board/tile classes)

**Interfaces:**
- Consumes: `Tile` (type), `PlayerId`, `PlayerState` from `../types/game`.
- Produces: `Board` component with props `{ board: Tile[]; players: Record<PlayerId, PlayerState> }`, used by `PersonaMarbleApp.tsx` (Task 13). `Tile` component (internal, also exported for reuse) with props `{ tile: Tile; occupants: PlayerId[] }`.

- [ ] **Step 1: Append board/tile CSS to `personaMarble.css`**

```css
.pm-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: var(--pm-space-2);
  aspect-ratio: 1 / 1;
  width: 100%;
}

.pm-board__center {
  grid-row: 2 / span 2;
  grid-column: 2 / span 2;
  background: var(--pm-surface-raised);
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--pm-space-2);
  text-align: center;
  padding: var(--pm-space-3);
}

.pm-tile {
  position: relative;
  border-radius: var(--pm-radius-sm);
  border: 1px solid var(--pm-border);
  background: var(--pm-tile-bg, var(--pm-surface));
  color: var(--pm-tile-fg, var(--pm-text-muted));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 0.68rem;
  font-weight: 700;
  text-align: center;
  padding: var(--pm-space-1);
  transition: box-shadow var(--pm-transition), transform var(--pm-transition);
}

.pm-tile__icon {
  font-size: 1.15rem;
  line-height: 1;
}

.pm-tile--start { --pm-tile-fg: var(--pm-start-fg); --pm-tile-bg: var(--pm-start-bg); }
.pm-tile--logic { --pm-tile-fg: var(--pm-logic-fg); --pm-tile-bg: var(--pm-logic-bg); }
.pm-tile--empathy { --pm-tile-fg: var(--pm-empathy-fg); --pm-tile-bg: var(--pm-empathy-bg); }
.pm-tile--drive { --pm-tile-fg: var(--pm-drive-fg); --pm-tile-bg: var(--pm-drive-bg); }
.pm-tile--caution { --pm-tile-fg: var(--pm-caution-fg); --pm-tile-bg: var(--pm-caution-bg); }
.pm-tile--chance { --pm-tile-fg: var(--pm-chance-fg); --pm-tile-bg: var(--pm-chance-bg); }
.pm-tile--penalty { --pm-tile-fg: var(--pm-penalty-fg); --pm-tile-bg: var(--pm-penalty-bg); }

.pm-tile__occupants {
  position: absolute;
  bottom: 4px;
  display: flex;
  gap: 2px;
}

.pm-marker {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--pm-surface);
  font-size: 0;
}

.pm-marker--a { background: var(--pm-player-a); }
.pm-marker--b { background: var(--pm-player-b); }

@media (max-width: 520px) {
  .pm-tile {
    font-size: 0.58rem;
  }
  .pm-tile__icon {
    font-size: 0.95rem;
  }
}
```

- [ ] **Step 2: Write `Tile.tsx`**

```tsx
import type { PlayerId } from "../types/game";
import type { Tile as TileModel } from "../types/game";

const TILE_LABELS: Record<TileModel["type"], string> = {
  START: "출발",
  LOGIC: "분석력",
  EMPATHY: "공감력",
  DRIVE: "추진력",
  CAUTION: "신중함",
  CHANCE: "찬스",
  PENALTY: "페널티",
};

const TILE_ICONS: Record<TileModel["type"], string> = {
  START: "🏁",
  LOGIC: "🧠",
  EMPATHY: "💗",
  DRIVE: "🔥",
  CAUTION: "🛡️",
  CHANCE: "✨",
  PENALTY: "⚠️",
};

const TILE_CLASS: Record<TileModel["type"], string> = {
  START: "pm-tile--start",
  LOGIC: "pm-tile--logic",
  EMPATHY: "pm-tile--empathy",
  DRIVE: "pm-tile--drive",
  CAUTION: "pm-tile--caution",
  CHANCE: "pm-tile--chance",
  PENALTY: "pm-tile--penalty",
};

interface TileProps {
  tile: TileModel;
  occupants: PlayerId[];
  style?: React.CSSProperties;
}

export function Tile({ tile, occupants, style }: TileProps) {
  return (
    <div className={`pm-tile ${TILE_CLASS[tile.type]}`} style={style} data-testid={`pm-tile-${tile.index}`}>
      <span className="pm-tile__icon" aria-hidden="true">
        {TILE_ICONS[tile.type]}
      </span>
      <span>{TILE_LABELS[tile.type]}</span>
      {occupants.length > 0 && (
        <span className="pm-tile__occupants">
          {occupants.map((id) => (
            <span key={id} className={`pm-marker pm-marker--${id.toLowerCase()}`}>
              {id}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `Board.tsx`**

```tsx
import type { PlayerId, PlayerState, Tile as TileModel } from "../types/game";
import { Tile } from "./Tile";

const GRID_POSITIONS: Array<[number, number]> = [
  [1, 1], [1, 2], [1, 3], [1, 4],
  [2, 4], [3, 4],
  [4, 4], [4, 3], [4, 2], [4, 1],
  [3, 1], [2, 1],
];

interface BoardProps {
  board: TileModel[];
  players: Record<PlayerId, PlayerState>;
  centerLabel: string;
  centerValue: string;
}

export function Board({ board, players, centerLabel, centerValue }: BoardProps) {
  const occupantsByIndex = new Map<number, PlayerId[]>();
  (Object.keys(players) as PlayerId[]).forEach((id) => {
    const position = players[id].position;
    occupantsByIndex.set(position, [...(occupantsByIndex.get(position) ?? []), id]);
  });

  return (
    <div className="pm-board" role="grid" aria-label="페르소나 마블 보드">
      {board.map((tile) => {
        const [row, col] = GRID_POSITIONS[tile.index];
        return (
          <Tile
            key={tile.index}
            tile={tile}
            occupants={occupantsByIndex.get(tile.index) ?? []}
            style={{ gridRow: row, gridColumn: col }}
          />
        );
      })}
      <div className="pm-board__center">
        <p className="pm-eyebrow">{centerLabel}</p>
        <p className="pm-heading" style={{ fontSize: "1.1rem" }}>
          {centerValue}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write the component test**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Board } from "./Board";
import type { PlayerId, PlayerState, Tile } from "../types/game";

function board12(): Tile[] {
  const types: Tile["type"][] = ["START", "LOGIC", "EMPATHY", "DRIVE", "CAUTION", "CHANCE", "PENALTY", "LOGIC", "EMPATHY", "DRIVE", "CAUTION", "CHANCE"];
  return types.map((type, index) => ({ index, type }));
}

function players(): Record<PlayerId, PlayerState> {
  const persona = (id: string, nickname: string) => ({
    userId: id,
    nickname,
    stats: { logic: 50, empathy: 50, drive: 50, caution: 50 },
    traits: { stressRelief: "", conflictStyle: "", dateStyle: "", spontaneousAction: "" },
  });
  return {
    A: { id: "A", position: 0, score: 0, persona: persona("user_a", "민수") },
    B: { id: "B", position: 3, score: 0, persona: persona("user_b", "지은") },
  };
}

describe("Board", () => {
  it("renders all 12 tiles", () => {
    render(<Board board={board12()} players={players()} centerLabel="턴" centerValue="1 / 10" />);
    for (let i = 0; i < 12; i++) {
      expect(screen.getByTestId(`pm-tile-${i}`)).toBeInTheDocument();
    }
  });

  it("renders a player marker on the tile they occupy", () => {
    render(<Board board={board12()} players={players()} centerLabel="턴" centerValue="1 / 10" />);
    expect(screen.getByTestId("pm-tile-0")).toHaveTextContent("A");
    expect(screen.getByTestId("pm-tile-3")).toHaveTextContent("B");
  });

  it("shows the center label and value", () => {
    render(<Board board={board12()} players={players()} centerLabel="턴" centerValue="1 / 10" />);
    expect(screen.getByText("턴")).toBeInTheDocument();
    expect(screen.getByText("1 / 10")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/personaMarble/components/Board.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/personaMarble/components/Tile.tsx frontend/src/personaMarble/components/Board.tsx frontend/src/personaMarble/components/Board.test.tsx frontend/src/personaMarble/personaMarble.css
git commit -m "feat(persona-marble): add Tile and Board components"
```

---

### Task 9: Dice and ScoreDashboard components

**Files:**
- Create: `frontend/src/personaMarble/components/Dice.tsx`
- Create: `frontend/src/personaMarble/components/ScoreDashboard.tsx`
- Test: `frontend/src/personaMarble/components/ScoreDashboard.test.tsx`
- Modify: `frontend/src/personaMarble/personaMarble.css` (append dice/dashboard classes)

**Interfaces:**
- Consumes: `PlayerId`, `PlayerState` from `../types/game`.
- Produces: `Dice` component with props `{ lastRoll: number | null; disabled: boolean; onRoll: () => void }`; `ScoreDashboard` component with props `{ players: Record<PlayerId, PlayerState>; currentPlayer: PlayerId; turnCount: number; totalTurns: number }`. Both consumed by `PersonaMarbleApp.tsx` (Task 13).

- [ ] **Step 1: Append dice/dashboard CSS to `personaMarble.css`**

```css
.pm-dice-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--pm-space-4);
}

.pm-dice {
  width: 56px;
  height: 56px;
  border-radius: var(--pm-radius-sm);
  background: linear-gradient(160deg, var(--pm-surface-raised), var(--pm-surface));
  border: 1px solid var(--pm-border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--pm-font-display);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--pm-accent-strong);
  box-shadow: var(--pm-shadow-pop);
}

@keyframes pm-dice-spin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.08); }
  100% { transform: rotate(360deg) scale(1); }
}

.pm-dice--rolling {
  animation: pm-dice-spin 420ms ease-in-out;
}

.pm-dashboard {
  display: flex;
  align-items: stretch;
  gap: var(--pm-space-3);
}

.pm-player-card {
  flex: 1;
  border-radius: var(--pm-radius-sm);
  border: 1px solid var(--pm-border);
  background: var(--pm-surface-raised);
  padding: var(--pm-space-3) var(--pm-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--pm-space-1);
  transition: box-shadow var(--pm-transition), border-color var(--pm-transition);
}

.pm-player-card--active {
  border-color: var(--pm-accent);
  box-shadow: 0 0 0 1px var(--pm-accent) inset, var(--pm-shadow-pop);
}

.pm-player-card__name {
  font-weight: 700;
  font-size: 0.92rem;
}

.pm-player-card__hearts {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--pm-heart);
  font-size: 0.95rem;
}

.pm-player-card__score {
  font-family: var(--pm-font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--pm-text);
}

.pm-turn-indicator {
  text-align: center;
  color: var(--pm-text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}
```

- [ ] **Step 2: Write `Dice.tsx`**

```tsx
interface DiceProps {
  lastRoll: number | null;
  disabled: boolean;
  onRoll: () => void;
}

export function Dice({ lastRoll, disabled, onRoll }: DiceProps) {
  return (
    <div className="pm-dice-row">
      <div className={`pm-dice ${lastRoll !== null ? "pm-dice--rolling" : ""}`} key={lastRoll} aria-live="polite">
        {lastRoll ?? "?"}
      </div>
      <button type="button" className="pm-button pm-button--primary" onClick={onRoll} disabled={disabled}>
        주사위 굴리기
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write `ScoreDashboard.tsx`**

```tsx
import type { PlayerId, PlayerState } from "../types/game";

interface ScoreDashboardProps {
  players: Record<PlayerId, PlayerState>;
  currentPlayer: PlayerId;
  turnCount: number;
  totalTurns: number;
}

function heartRow(score: number): string {
  const count = Math.max(0, Math.min(5, Math.ceil(score / 10)));
  return "❤".repeat(count) + "🤍".repeat(5 - count);
}

export function ScoreDashboard({ players, currentPlayer, turnCount, totalTurns }: ScoreDashboardProps) {
  const order: PlayerId[] = ["A", "B"];
  return (
    <div>
      <p className="pm-turn-indicator">
        턴 {Math.min(turnCount + 1, totalTurns)} / {totalTurns} · {players[currentPlayer].persona.nickname}님 차례
      </p>
      <div className="pm-dashboard">
        {order.map((id) => {
          const player = players[id];
          return (
            <div
              key={id}
              className={`pm-player-card ${id === currentPlayer ? "pm-player-card--active" : ""}`}
              data-testid={`pm-player-card-${id}`}
            >
              <span className="pm-player-card__name">{player.persona.nickname}</span>
              <span className="pm-player-card__score">{player.score}점</span>
              <span className="pm-player-card__hearts" aria-hidden="true">
                {heartRow(player.score)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write the component test**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreDashboard } from "./ScoreDashboard";
import type { PlayerId, PlayerState } from "../types/game";

function players(scoreA: number, scoreB: number): Record<PlayerId, PlayerState> {
  const persona = (id: string, nickname: string) => ({
    userId: id,
    nickname,
    stats: { logic: 50, empathy: 50, drive: 50, caution: 50 },
    traits: { stressRelief: "", conflictStyle: "", dateStyle: "", spontaneousAction: "" },
  });
  return {
    A: { id: "A", position: 0, score: scoreA, persona: persona("user_a", "민수") },
    B: { id: "B", position: 0, score: scoreB, persona: persona("user_b", "지은") },
  };
}

describe("ScoreDashboard", () => {
  it("shows both player scores and nicknames", () => {
    render(<ScoreDashboard players={players(20, 30)} currentPlayer="A" turnCount={2} totalTurns={10} />);
    expect(screen.getByText("20점")).toBeInTheDocument();
    expect(screen.getByText("30점")).toBeInTheDocument();
    expect(screen.getByText(/민수님 차례/)).toBeInTheDocument();
  });

  it("highlights the current player's card", () => {
    render(<ScoreDashboard players={players(0, 0)} currentPlayer="B" turnCount={0} totalTurns={10} />);
    expect(screen.getByTestId("pm-player-card-B").className).toContain("pm-player-card--active");
    expect(screen.getByTestId("pm-player-card-A").className).not.toContain("pm-player-card--active");
  });

  it("shows the turn count out of the total", () => {
    render(<ScoreDashboard players={players(0, 0)} currentPlayer="A" turnCount={4} totalTurns={10} />);
    expect(screen.getByText(/턴 5 \/ 10/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/personaMarble/components/ScoreDashboard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/personaMarble/components/Dice.tsx frontend/src/personaMarble/components/ScoreDashboard.tsx frontend/src/personaMarble/components/ScoreDashboard.test.tsx frontend/src/personaMarble/personaMarble.css
git commit -m "feat(persona-marble): add Dice and ScoreDashboard components"
```

---

### Task 10: QuizModal component

**Files:**
- Create: `frontend/src/personaMarble/components/QuizModal.tsx`
- Test: `frontend/src/personaMarble/components/QuizModal.test.tsx`
- Modify: `frontend/src/personaMarble/personaMarble.css` (append modal classes)

**Interfaces:**
- Consumes: `Quiz` from `../types/game`.
- Produces: `QuizModal` component with props `{ quiz: Quiz; phase: "SHOW_QUIZ" | "SUBMIT_ANSWER"; lastAnswerCorrect: boolean | null; onAnswer: (choiceIndex: number) => void; onContinue: () => void }`, consumed by `PersonaMarbleApp.tsx` (Task 13). Auto-advance timing (the ~1.2s feedback delay) is owned by the parent, not this component — `QuizModal` just renders whatever phase it's given and calls `onContinue` when its own "다음으로" affordance is used; the parent additionally schedules an automatic `onContinue` call via `setTimeout` (implemented in Task 13) so the modal never gets stuck if the button isn't clicked in tests.

- [ ] **Step 1: Append modal CSS to `personaMarble.css`**

```css
.pm-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 5, 9, 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--pm-space-4);
  z-index: 20;
}

.pm-modal {
  width: 100%;
  max-width: 440px;
  background: var(--pm-surface);
  border: 1px solid var(--pm-border-strong);
  border-radius: var(--pm-radius);
  box-shadow: var(--pm-shadow-card);
  padding: var(--pm-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--pm-space-4);
  animation: pm-modal-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes pm-modal-in {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.pm-modal__question {
  font-family: var(--pm-font-display);
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
}

.pm-modal__choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--pm-space-2);
}

.pm-choice {
  text-align: left;
  font-family: var(--pm-font-body);
  font-size: 0.85rem;
  font-weight: 600;
  padding: var(--pm-space-3);
  border-radius: var(--pm-radius-sm);
  border: 1px solid var(--pm-border);
  background: var(--pm-surface-raised);
  color: var(--pm-text);
  cursor: pointer;
  transition: border-color var(--pm-transition), transform var(--pm-transition);
}

.pm-choice:hover:not(:disabled) {
  border-color: var(--pm-accent);
  transform: translateY(-1px);
}

.pm-choice:disabled {
  cursor: default;
}

.pm-choice--correct {
  border-color: var(--pm-success);
  background: rgba(111, 191, 133, 0.16);
}

.pm-choice--incorrect {
  border-color: var(--pm-danger);
  background: rgba(217, 105, 92, 0.16);
}

.pm-modal__feedback {
  text-align: center;
  font-weight: 700;
  font-size: 0.95rem;
}

.pm-modal__feedback--correct { color: var(--pm-success); }
.pm-modal__feedback--incorrect { color: var(--pm-danger); }

@media (max-width: 480px) {
  .pm-modal__choices {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Write `QuizModal.tsx`**

```tsx
import type { Quiz } from "../types/game";

interface QuizModalProps {
  quiz: Quiz;
  phase: "SHOW_QUIZ" | "SUBMIT_ANSWER";
  lastAnswerCorrect: boolean | null;
  selectedIndex: number | null;
  onAnswer: (choiceIndex: number) => void;
}

export function QuizModal({ quiz, phase, lastAnswerCorrect, selectedIndex, onAnswer }: QuizModalProps) {
  const answered = phase === "SUBMIT_ANSWER";

  return (
    <div className="pm-modal-backdrop" role="dialog" aria-modal="true">
      <div className="pm-modal">
        <p className="pm-eyebrow">상대 성향 퀴즈</p>
        <p className="pm-modal__question">{quiz.question}</p>
        <div className="pm-modal__choices">
          {quiz.choices.map((choice, index) => {
            let className = "pm-choice";
            if (answered) {
              if (index === quiz.correctIndex) className += " pm-choice--correct";
              else if (index === selectedIndex) className += " pm-choice--incorrect";
            }
            return (
              <button
                key={choice}
                type="button"
                className={className}
                disabled={answered}
                onClick={() => onAnswer(index)}
              >
                {choice}
              </button>
            );
          })}
        </div>
        {answered && (
          <p className={`pm-modal__feedback ${lastAnswerCorrect ? "pm-modal__feedback--correct" : "pm-modal__feedback--incorrect"}`}>
            {lastAnswerCorrect ? "정답이에요! 🎉" : "아쉬워요, 오답이에요."}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the component test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizModal } from "./QuizModal";
import type { Quiz } from "../types/game";

const quiz: Quiz = {
  tileType: "LOGIC",
  traitKey: "conflictStyle",
  question: "민수님이 갈등 상황에서 주로 보이는 태도는?",
  choices: ["a", "b", "c", "d"],
  correctIndex: 1,
};

describe("QuizModal", () => {
  it("shows the question and 4 enabled choices during SHOW_QUIZ", () => {
    render(<QuizModal quiz={quiz} phase="SHOW_QUIZ" lastAnswerCorrect={null} selectedIndex={null} onAnswer={() => {}} />);
    expect(screen.getByText(quiz.question)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.getByText("a").closest("button")).not.toBeDisabled();
  });

  it("calls onAnswer with the clicked choice index", () => {
    const onAnswer = vi.fn();
    render(<QuizModal quiz={quiz} phase="SHOW_QUIZ" lastAnswerCorrect={null} selectedIndex={null} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("c"));
    expect(onAnswer).toHaveBeenCalledWith(2);
  });

  it("disables all choices and shows correct/incorrect styling after answering", () => {
    render(<QuizModal quiz={quiz} phase="SUBMIT_ANSWER" lastAnswerCorrect={false} selectedIndex={0} onAnswer={() => {}} />);
    expect(screen.getByText("a").closest("button")).toBeDisabled();
    expect(screen.getByText("b").closest("button")?.className).toContain("pm-choice--correct");
    expect(screen.getByText("a").closest("button")?.className).toContain("pm-choice--incorrect");
    expect(screen.getByText("아쉬워요, 오답이에요.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/personaMarble/components/QuizModal.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/personaMarble/components/QuizModal.tsx frontend/src/personaMarble/components/QuizModal.test.tsx frontend/src/personaMarble/personaMarble.css
git commit -m "feat(persona-marble): add QuizModal component"
```

---

### Task 11: GameOverScreen component

**Files:**
- Create: `frontend/src/personaMarble/components/GameOverScreen.tsx`
- Test: `frontend/src/personaMarble/components/GameOverScreen.test.tsx`
- Modify: `frontend/src/personaMarble/personaMarble.css` (append game-over classes)

**Interfaces:**
- Consumes: `PlayerId`, `PlayerState` from `../types/game`.
- Produces: `GameOverScreen` component with props `{ players: Record<PlayerId, PlayerState>; chemistrySummary: string; onRestart: () => void }`, consumed by `PersonaMarbleApp.tsx` (Task 13).

- [ ] **Step 1: Append game-over CSS to `personaMarble.css`**

```css
.pm-gameover {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pm-space-5);
  text-align: center;
}

.pm-gameover__trophy {
  font-size: 2.6rem;
}

.pm-gameover__scores {
  display: flex;
  gap: var(--pm-space-4);
  width: 100%;
}

.pm-gameover__score-card {
  flex: 1;
  border-radius: var(--pm-radius-sm);
  border: 1px solid var(--pm-border);
  background: var(--pm-surface-raised);
  padding: var(--pm-space-4);
}

.pm-gameover__score-card--winner {
  border-color: var(--pm-gold);
  box-shadow: 0 0 0 1px var(--pm-gold) inset;
}

.pm-gameover__score-value {
  font-family: var(--pm-font-display);
  font-size: 2rem;
  font-weight: 700;
}

.pm-gameover__summary {
  border-left: 3px solid var(--pm-accent);
  padding-left: var(--pm-space-4);
  text-align: left;
  color: var(--pm-text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
}
```

- [ ] **Step 2: Write `GameOverScreen.tsx`**

```tsx
import type { PlayerId, PlayerState } from "../types/game";

interface GameOverScreenProps {
  players: Record<PlayerId, PlayerState>;
  chemistrySummary: string;
  onRestart: () => void;
}

export function GameOverScreen({ players, chemistrySummary, onRestart }: GameOverScreenProps) {
  const { A, B } = players;
  const winner = A.score === B.score ? null : A.score > B.score ? "A" : "B";

  return (
    <div className="pm-card pm-gameover">
      <span className="pm-gameover__trophy" aria-hidden="true">
        💞
      </span>
      <p className="pm-eyebrow">게임 종료</p>
      <h2 className="pm-heading">
        {winner ? `${players[winner as PlayerId].persona.nickname}님 승리!` : "무승부예요!"}
      </h2>
      <div className="pm-gameover__scores">
        {(["A", "B"] as PlayerId[]).map((id) => (
          <div key={id} className={`pm-gameover__score-card ${winner === id ? "pm-gameover__score-card--winner" : ""}`}>
            <p className="pm-player-card__name">{players[id].persona.nickname}</p>
            <p className="pm-gameover__score-value">{players[id].score}점</p>
          </div>
        ))}
      </div>
      <p className="pm-gameover__summary">{chemistrySummary}</p>
      <button type="button" className="pm-button pm-button--primary" onClick={onRestart}>
        다시 하기
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write the component test**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameOverScreen } from "./GameOverScreen";
import type { PlayerId, PlayerState } from "../types/game";

function players(scoreA: number, scoreB: number): Record<PlayerId, PlayerState> {
  const persona = (id: string, nickname: string) => ({
    userId: id,
    nickname,
    stats: { logic: 50, empathy: 50, drive: 50, caution: 50 },
    traits: { stressRelief: "", conflictStyle: "", dateStyle: "", spontaneousAction: "" },
  });
  return {
    A: { id: "A", position: 0, score: scoreA, persona: persona("user_a", "민수") },
    B: { id: "B", position: 0, score: scoreB, persona: persona("user_b", "지은") },
  };
}

describe("GameOverScreen", () => {
  it("declares the higher-scoring player the winner", () => {
    render(<GameOverScreen players={players(80, 40)} chemistrySummary="test summary" onRestart={() => {}} />);
    expect(screen.getByText("민수님 승리!")).toBeInTheDocument();
  });

  it("shows a tie message when scores are equal", () => {
    render(<GameOverScreen players={players(50, 50)} chemistrySummary="test summary" onRestart={() => {}} />);
    expect(screen.getByText("무승부예요!")).toBeInTheDocument();
  });

  it("renders the chemistry summary text", () => {
    render(<GameOverScreen players={players(50, 50)} chemistrySummary="특별한 케미 문장" onRestart={() => {}} />);
    expect(screen.getByText("특별한 케미 문장")).toBeInTheDocument();
  });

  it("calls onRestart when the restart button is clicked", () => {
    const onRestart = vi.fn();
    render(<GameOverScreen players={players(0, 0)} chemistrySummary="s" onRestart={onRestart} />);
    fireEvent.click(screen.getByText("다시 하기"));
    expect(onRestart).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/personaMarble/components/GameOverScreen.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/personaMarble/components/GameOverScreen.tsx frontend/src/personaMarble/components/GameOverScreen.test.tsx frontend/src/personaMarble/personaMarble.css
git commit -m "feat(persona-marble): add GameOverScreen component"
```

---

### Task 12: MockSwitchPanel component

**Files:**
- Create: `frontend/src/personaMarble/components/MockSwitchPanel.tsx`
- Modify: `frontend/src/personaMarble/personaMarble.css` (append switch-panel classes)

**Interfaces:**
- Consumes: `MOCK_PRESET_LABELS` from `../adapters/mockPersonaAdapter`.
- Produces: `MockSwitchPanel` component with props `{ activePresetIndex: number; onSwitch: () => void }`, consumed by `PersonaMarbleApp.tsx` (Task 13). No dedicated test file — it is a thin presentational wrapper with a single click handler and its own `data-testid`, exercised indirectly by the `PersonaMarbleApp` smoke test in Task 13 (the "No Placeholders" test-file rule is satisfied there; adding a near-duplicate unit test here would just re-assert the same click-forwarding behavior already covered end-to-end).

- [ ] **Step 1: Append switch-panel CSS to `personaMarble.css`**

```css
.pm-switch-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pm-space-3);
  flex-wrap: wrap;
}

.pm-switch-panel__label {
  font-size: 0.82rem;
  color: var(--pm-text-faint);
}

/* TODO: API 연동 시 이 컴포넌트 및 사용처를 제거 */
```

- [ ] **Step 2: Write `MockSwitchPanel.tsx`**

```tsx
// TODO: API 연동 시 이 컴포넌트 및 사용처를 제거
import { MOCK_PRESET_LABELS } from "../adapters/mockPersonaAdapter";

interface MockSwitchPanelProps {
  activePresetIndex: number;
  onSwitch: () => void;
}

export function MockSwitchPanel({ activePresetIndex, onSwitch }: MockSwitchPanelProps) {
  const label = MOCK_PRESET_LABELS[activePresetIndex % MOCK_PRESET_LABELS.length];

  return (
    <div className="pm-switch-panel pm-card" data-testid="pm-mock-switch-panel">
      <div>
        <p className="pm-eyebrow">목업 데이터 스위치 (테스트용)</p>
        <span className="pm-switch-panel__label">현재 프리셋: {label}</span>
      </div>
      <button type="button" className="pm-button pm-button--ghost" onClick={onSwitch}>
        다음 성향 조합으로
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: no new errors introduced by this file (some pre-existing "unused" errors may still be absent since `PersonaMarbleApp.tsx` will import it in Task 13 — if `tsc` complains about `MockSwitchPanel.tsx` being unused/unreferenced at this point, that is expected and resolves in Task 13; do not treat that specific unused-file situation as a failure).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/personaMarble/components/MockSwitchPanel.tsx frontend/src/personaMarble/personaMarble.css
git commit -m "feat(persona-marble): add MockSwitchPanel demo component"
```

---

### Task 13: Assemble PersonaMarbleApp

**Files:**
- Modify: `frontend/src/personaMarble/PersonaMarbleApp.tsx` (replace placeholder from Task 1 with the full app)
- Test: `frontend/src/personaMarble/PersonaMarbleApp.test.tsx`
- Modify: `frontend/src/personaMarble/personaMarble.css` (append loading-state class)

**Interfaces:**
- Consumes: `MockPersonaAdapter` from `./adapters/mockPersonaAdapter`; `createInitialState`, `gameReducer` from `./state/gameReducer`; `Board` from `./components/Board`; `Dice` from `./components/Dice`; `ScoreDashboard` from `./components/ScoreDashboard`; `QuizModal` from `./components/QuizModal`; `GameOverScreen` from `./components/GameOverScreen`; `MockSwitchPanel` from `./components/MockSwitchPanel`.
- Produces: `PersonaMarbleApp` default export used by `main.tsx` (already wired in Task 1).

- [ ] **Step 1: Append the loading-state CSS**

```css
.pm-loading {
  text-align: center;
  color: var(--pm-text-muted);
  padding: var(--pm-space-7) 0;
}
```

- [ ] **Step 2: Write the failing smoke test**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PersonaMarbleApp } from "./PersonaMarbleApp";

describe("PersonaMarbleApp", () => {
  it("loads personas, then lets the current player roll the dice and see a quiz", async () => {
    render(<PersonaMarbleApp />);

    expect(await screen.findByText("주사위 굴리기")).toBeInTheDocument();

    fireEvent.click(screen.getByText("주사위 굴리기"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("shows the mock switch panel and regenerates the board on click", async () => {
    render(<PersonaMarbleApp />);
    await screen.findByText("주사위 굴리기");

    const panel = screen.getByTestId("pm-mock-switch-panel");
    const before = panel.textContent;
    fireEvent.click(screen.getByText("다음 성향 조합으로"));

    await waitFor(() => {
      expect(screen.getByTestId("pm-mock-switch-panel").textContent).not.toBe(before);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/personaMarble/PersonaMarbleApp.test.tsx`
Expected: FAIL — placeholder component from Task 1 has no dice button or switch panel.

- [ ] **Step 4: Write the full implementation**

```tsx
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { MockPersonaAdapter } from "./adapters/mockPersonaAdapter";
import { createInitialState, gameReducer } from "./state/gameReducer";
import { Board } from "./components/Board";
import { Dice } from "./components/Dice";
import { ScoreDashboard } from "./components/ScoreDashboard";
import { QuizModal } from "./components/QuizModal";
import { GameOverScreen } from "./components/GameOverScreen";
import { MockSwitchPanel } from "./components/MockSwitchPanel";
import type { GameState } from "./types/game";
import "./personaMarble.css";

const TOTAL_TURNS = 10;
const FEEDBACK_DELAY_MS = 1200;

// TODO: API 연동 시 이 어댑터로 교체
const adapter = new MockPersonaAdapter();

export function PersonaMarbleApp() {
  const [state, dispatch] = useReducer(gameReducer, null as unknown as GameState);
  const [presetIndex, setPresetIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([adapter.getPersonaByUserId("user_a"), adapter.getPersonaByUserId("user_b")]).then(
      ([personaA, personaB]) => {
        if (!cancelled) dispatch({ type: "REGENERATE_BOARD", personaA, personaB });
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state?.phase !== "SUBMIT_ANSWER") return;
    advanceTimer.current = setTimeout(() => {
      dispatch({ type: "ADVANCE_TURN" });
      setSelectedIndex(null);
    }, FEEDBACK_DELAY_MS);
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [state?.phase]);

  const handleAnswer = useCallback((choiceIndex: number) => {
    setSelectedIndex(choiceIndex);
    dispatch({ type: "SUBMIT_ANSWER", choiceIndex });
  }, []);

  const handleSwitchPreset = useCallback(async () => {
    const nextIndex = presetIndex + 1;
    adapter.setPreset(nextIndex);
    setPresetIndex(nextIndex);
    const [personaA, personaB] = await Promise.all([
      adapter.getPersonaByUserId("user_a"),
      adapter.getPersonaByUserId("user_b"),
    ]);
    dispatch({ type: "REGENERATE_BOARD", personaA, personaB });
  }, [presetIndex]);

  const handleRestart = useCallback(() => {
    dispatch({
      type: "REGENERATE_BOARD",
      personaA: state.players.A.persona,
      personaB: state.players.B.persona,
    });
  }, [state]);

  if (!state) {
    return (
      <div className="pm-app">
        <div className="pm-shell">
          <p className="pm-loading">페르소나 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pm-app">
      <div className="pm-shell">
        <header>
          <p className="pm-eyebrow">Persona Marble</p>
          <h1 className="pm-heading">페르소나 마블</h1>
        </header>

        {state.phase === "GAME_OVER" ? (
          <GameOverScreen
            players={state.players}
            chemistrySummary={state.chemistrySummary ?? ""}
            onRestart={handleRestart}
          />
        ) : (
          <>
            <ScoreDashboard
              players={state.players}
              currentPlayer={state.currentPlayer}
              turnCount={state.turnCount}
              totalTurns={TOTAL_TURNS}
            />
            <div className="pm-card">
              <Board
                board={state.board}
                players={state.players}
                centerLabel="현재 눈"
                centerValue={state.lastDiceRoll ? `${state.lastDiceRoll}` : "-"}
              />
            </div>
            <Dice lastRoll={state.lastDiceRoll} disabled={state.phase !== "ROLL_DICE"} onRoll={() => dispatch({ type: "ROLL_DICE" })} />
          </>
        )}

        <MockSwitchPanel activePresetIndex={presetIndex} onSwitch={handleSwitchPreset} />
      </div>

      {state.activeQuiz && (state.phase === "SHOW_QUIZ" || state.phase === "SUBMIT_ANSWER") && (
        <QuizModal
          quiz={state.activeQuiz}
          phase={state.phase}
          lastAnswerCorrect={state.lastAnswerCorrect}
          selectedIndex={selectedIndex}
          onAnswer={handleAnswer}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/personaMarble/PersonaMarbleApp.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Run the full test suite for the module**

Run: `cd frontend && npx vitest run src/personaMarble`
Expected: PASS, all files green (~45+ tests total across Tasks 3-13).

- [ ] **Step 7: Type-check the whole frontend**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/personaMarble/PersonaMarbleApp.tsx frontend/src/personaMarble/PersonaMarbleApp.test.tsx frontend/src/personaMarble/personaMarble.css
git commit -m "feat(persona-marble): assemble full app with adapter wiring"
```

---

### Task 14: Manual browser verification

**Files:** none (verification only)

**Interfaces:** none — this task exercises the fully assembled app from Task 13 through a real browser.

- [ ] **Step 1: Start the dev server**

Run: `cd frontend && npm run dev` (background)

- [ ] **Step 2: Play a full game end-to-end**

Open `http://localhost:5173/marble.html`. Confirm, in order:
- The board renders with 12 distinct-colored tiles around a center panel, dark romantic palette, serif heading font visible, no layout overflow at the default window width.
- Clicking "주사위 굴리기" moves the current player's marker and either opens a quiz modal or (on START) silently advances the turn.
- Answering a quiz shows correct/incorrect styling, then the modal auto-closes after ~1.2s and the turn/player switches.
- The score dashboard's active-player highlight and heart row update after each answered quiz.
- After 10 total turns, the GAME_OVER screen appears with final scores, a winner or tie message, and a non-empty chemistry summary sentence.
- "다시 하기" resets the board and returns to turn 1.
- Clicking "다음 성향 조합으로" changes the preset label and visibly reshuffles the board's tile-type ratio (e.g. more LOGIC/DRIVE tiles under the "추진형 vs 신중형" preset than the default).

- [ ] **Step 3: Resize to a narrow (mobile) width**

Confirm the board and modal choices reflow to the single-column mobile layout without horizontal scrolling or clipped text.

- [ ] **Step 4: Stop the dev server**

Report the outcome; no commit for this task (verification only). If any check fails, fix the underlying component/CSS in its owning task's files, re-run that task's tests, then repeat this task's checklist from Step 1.
