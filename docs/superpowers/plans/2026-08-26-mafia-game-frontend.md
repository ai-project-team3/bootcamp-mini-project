# Mafia Game Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real, playable React web frontend for the mafia game at `frontend/` inside this same project, driving the backend API from `docs/superpowers/plans/2026-08-26-mafia-game-backend.md` — room creation/join, waiting room, private role reveal, day discussion/vote, role-gated night actions, and the full spec §6 result briefing (persona radar chart, per-player match reason, superlatives).

**Architecture:** A single-page React app that polls `GET /rooms/{id}/state` every second and renders whichever page matches the current `GamePhase`, exactly mirroring the backend state machine. All backend calls go through one typed `api/client.ts`. Player identity (`roomId`/`playerId`/`isHost`) persists in `localStorage` so a refreshed tab resumes as the same player. Each browser tab is one player — this is the "each person on their own device" model from the original design doc, tested locally by opening one tab per player.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + @testing-library/react (jsdom) for tests. No routing library — the phase from polled room state IS the router. No CSS framework — plain semantic HTML, styling is not this plan's concern.

**Spec:** `docs/mafia_game_design.md` (original design), `docs/superpowers/plans/2026-08-26-mafia-game-backend.md` (backend this frontend talks to — read it for exact endpoint shapes).

## Global Constraints

- Backend runs at `http://localhost:8000` (uvicorn default); frontend dev server runs at `http://localhost:5173` (Vite default). The backend's CORS middleware only allows `http://localhost:5173` — do not change the frontend dev port without also updating the backend.
- `GamePhase` values (backend `mafia_game/game/state.py`): `WAITING_ROOM`, `ROLE_ASSIGNMENT`, `DAY_DISCUSSION`, `DAY_VOTE`, `NIGHT_ACTION`, `RESULT`. There is no persisted `WIN_CHECK` phase — the backend resolves it synchronously inside `resolve_day`/`resolve_night`.
- There is no server timer. Every phase transition (`DAY_DISCUSSION → DAY_VOTE`, etc.) happens only when the host clicks a "다음 단계로"-style button that calls `POST /rooms/{room_id}/advance`.
- The first player to call `POST /rooms/{room_id}/join` becomes host; the join response includes `is_host`, and `GET /rooms/{room_id}/state` echoes `host_player_id` so every tab can independently determine who the host is.
- A player's own role/investigation result is only ever readable via `GET /rooms/{room_id}/players/{player_id}/me` — never expose another player's role client-side. `GET /rooms/{room_id}/state` never contains role data.
- Real persona data isn't available yet. The waiting room's host-only "무작위 성향 데이터 채우기" button calls `POST /rooms/{room_id}/persona/mock`, a dev/demo-only endpoint. In production the external persona team would call `POST /rooms/{room_id}/persona` directly with real data in the exact same JSON shape (spec §2.2) — nothing in this frontend needs to change when that happens, since it only ever reads the *result* of persona assignment (role, `assigned_score`, `assigned_by`, `persona_scores`), never the raw submission path.
- Role → action-type mapping for night actions: `mafia → "kill"`, `police → "investigate"`, `doctor → "protect"`, `citizen → (no action, wait screen)`.
- Superlatives and match-reason text are computed client-side from `GET /rooms/{room_id}/result` data (spec §6.1/§6.2 — this is explicitly meant to be derivable from structured data without an LLM call).

---

## Task 1: Project Scaffolding

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx` (placeholder, replaced in Task 14)
- Create: `frontend/src/test/setup.ts`

**Interfaces:**
- Produces: a `frontend/` app that installs, type-checks, and runs `npm test` cleanly with zero tests (the scaffolding checkpoint — first real tests land in Task 2).

- [ ] **Step 1: Create config and entrypoint files**

`frontend/package.json`:
```json
{
  "name": "mafia-game-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.2",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.9",
    "vitest": "^2.1.3"
  }
}
```

`frontend/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    passWithNoTests: true,
  },
});
```

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

`frontend/index.html`:
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>마피아 게임</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`frontend/src/App.tsx` (placeholder — Task 14 replaces this with real phase routing):
```tsx
export function App() {
  return <div>Mafia Game</div>;
}
```

`frontend/src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 2: Install dependencies and verify the toolchain**

Run (from `frontend/`): `npm install`
Expected: exits 0, `node_modules` created.

Run: `npm test`
Expected: exits 0 ("No test files found" is treated as a pass because of `passWithNoTests: true`).

Run: `npx tsc -b`
Expected: exits 0 (no type errors in the placeholder `App.tsx`/`main.tsx`).

- [ ] **Step 3: Initialize this as part of the shared repo and commit**

Run (from the `miniproject` repo root, not `frontend/`):
```bash
git add frontend/
git commit -m "chore: scaffold React + Vite + TypeScript frontend"
```

---

## Task 2: API Client — Types and Requests

**Files:**
- Create: `frontend/src/api/types.ts`
- Create: `frontend/src/api/client.ts`
- Test: `frontend/src/api/client.test.ts`

**Interfaces:**
- Produces: `GamePhase`, `RoomPlayerSummary`, `RoomState`, `MyView`, `PersonaScores`, `ResultPlayer`, `GameResult` (types); `createRoom`, `joinRoom`, `submitMockPersona`, `startGame`, `advancePhase`, `castVote`, `submitNightAction`, `getRoomState`, `getMyView`, `getResult` (functions), all hitting `http://localhost:8000`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/api/client.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoom, getRoomState } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("createRoom posts player_count and returns room_id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ room_id: "abc" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createRoom(4);

    expect(result).toEqual({ room_id: "abc" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/rooms");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toEqual({ player_count: 4 });
  });

  it("throws a descriptive error when the response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "player_count must be 4, 5, or 6",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getRoomState("room1")).rejects.toThrow(/400/);
  });

  it("getRoomState issues a GET to the room's state endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        phase: "WAITING_ROOM",
        day_number: 0,
        night_number: 0,
        host_player_id: null,
        player_count: 4,
        players: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getRoomState("room1");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/rooms/room1/state");
    expect(options?.method ?? "GET").toBe("GET");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `frontend/`): `npx vitest run src/api/client.test.ts`
Expected: FAIL — `Cannot find module './client'`

- [ ] **Step 3: Implement types and the client**

`frontend/src/api/types.ts`:
```ts
export type GamePhase =
  | "WAITING_ROOM"
  | "ROLE_ASSIGNMENT"
  | "DAY_DISCUSSION"
  | "DAY_VOTE"
  | "NIGHT_ACTION"
  | "RESULT";

export type Role = "mafia" | "police" | "doctor" | "citizen";
export type AssignedBy = "preference" | "fallback_random";

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

`frontend/src/api/client.ts`:
```ts
import type { GameResult, MyView, RoomState } from "./types";

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

export function castVote(roomId: string, voterId: string, targetId: string) {
  return request<{ status: string }>(`/rooms/${roomId}/vote`, {
    method: "POST",
    body: JSON.stringify({ voter_id: voterId, target_id: targetId }),
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/api/client.test.ts`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/types.ts frontend/src/api/client.ts frontend/src/api/client.test.ts
git commit -m "feat(frontend): add typed API client for the backend"
```

---

## Task 3: Player Session Hook (localStorage identity)

**Files:**
- Create: `frontend/src/hooks/usePlayerSession.ts`
- Test: `frontend/src/hooks/usePlayerSession.test.ts`

**Interfaces:**
- Produces: `PlayerSession` (`{ roomId, playerId, isHost }`), `usePlayerSession()` returning `{ session, setSession, clearSession }`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/hooks/usePlayerSession.test.ts`:
```ts
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePlayerSession } from "./usePlayerSession";

describe("usePlayerSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts with no session when localStorage is empty", () => {
    const { result } = renderHook(() => usePlayerSession());
    expect(result.current.session).toBeNull();
  });

  it("persists a session to localStorage and reflects it in state", () => {
    const { result } = renderHook(() => usePlayerSession());

    act(() => {
      result.current.setSession({ roomId: "r1", playerId: "p1", isHost: true });
    });

    expect(result.current.session).toEqual({ roomId: "r1", playerId: "p1", isHost: true });
    expect(JSON.parse(window.localStorage.getItem("mafia_game_session")!)).toEqual({
      roomId: "r1",
      playerId: "p1",
      isHost: true,
    });
  });

  it("a fresh hook instance picks up a session already in localStorage", () => {
    window.localStorage.setItem(
      "mafia_game_session",
      JSON.stringify({ roomId: "r1", playerId: "p1", isHost: false })
    );
    const { result } = renderHook(() => usePlayerSession());
    expect(result.current.session).toEqual({ roomId: "r1", playerId: "p1", isHost: false });
  });

  it("clearSession removes the stored session", () => {
    const { result } = renderHook(() => usePlayerSession());
    act(() => {
      result.current.setSession({ roomId: "r1", playerId: "p1", isHost: true });
    });
    act(() => {
      result.current.clearSession();
    });
    expect(result.current.session).toBeNull();
    expect(window.localStorage.getItem("mafia_game_session")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/usePlayerSession.test.ts`
Expected: FAIL — `Cannot find module './usePlayerSession'`

- [ ] **Step 3: Implement the hook**

`frontend/src/hooks/usePlayerSession.ts`:
```ts
import { useCallback, useState } from "react";

export interface PlayerSession {
  roomId: string;
  playerId: string;
  isHost: boolean;
}

const STORAGE_KEY = "mafia_game_session";

function readStoredSession(): PlayerSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlayerSession) : null;
  } catch {
    return null;
  }
}

export function usePlayerSession() {
  const [session, setSessionState] = useState<PlayerSession | null>(() => readStoredSession());

  const setSession = useCallback((next: PlayerSession) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSessionState(next);
  }, []);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSessionState(null);
  }, []);

  return { session, setSession, clearSession };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/usePlayerSession.test.ts`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/usePlayerSession.ts frontend/src/hooks/usePlayerSession.test.ts
git commit -m "feat(frontend): add localStorage-backed player session hook"
```

---

## Task 4: Room State Polling Hook

**Files:**
- Create: `frontend/src/hooks/useRoomState.ts`
- Test: `frontend/src/hooks/useRoomState.test.ts`

**Interfaces:**
- Consumes: `getRoomState` from `frontend/src/api/client.ts` (Task 2).
- Produces: `useRoomState(roomId: string | null)` returning `{ state: RoomState | null, error: string | null }`, polling every 1000ms.

- [ ] **Step 1: Write the failing tests**

`frontend/src/hooks/useRoomState.test.ts`:
```ts
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRoomState } from "./useRoomState";
import * as client from "../api/client";

const sampleState = {
  phase: "WAITING_ROOM" as const,
  day_number: 0,
  night_number: 0,
  host_player_id: null,
  player_count: 4,
  players: [],
};

describe("useRoomState", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("fetches immediately and stores the result", async () => {
    vi.spyOn(client, "getRoomState").mockResolvedValue(sampleState);

    const { result } = renderHook(() => useRoomState("room1"));

    await waitFor(() => expect(result.current.state?.phase).toBe("WAITING_ROOM"));
  });

  it("polls again after the interval elapses", async () => {
    const spy = vi.spyOn(client, "getRoomState").mockResolvedValue(sampleState);

    renderHook(() => useRoomState("room1"));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("does nothing when roomId is null", () => {
    const spy = vi.spyOn(client, "getRoomState");
    renderHook(() => useRoomState(null));
    expect(spy).not.toHaveBeenCalled();
  });

  it("surfaces fetch errors without throwing", async () => {
    vi.spyOn(client, "getRoomState").mockRejectedValue(new Error("API error 404: Room not found"));

    const { result } = renderHook(() => useRoomState("missing-room"));

    await waitFor(() => expect(result.current.error).toMatch(/404/));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useRoomState.test.ts`
Expected: FAIL — `Cannot find module './useRoomState'`

- [ ] **Step 3: Implement the hook**

`frontend/src/hooks/useRoomState.ts`:
```ts
import { useEffect, useState } from "react";
import { getRoomState } from "../api/client";
import type { RoomState } from "../api/types";

const POLL_INTERVAL_MS = 1000;

export function useRoomState(roomId: string | null) {
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const next = await getRoomState(roomId);
        if (!cancelled) {
          setState(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    };

    poll();
    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [roomId]);

  return { state, error };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useRoomState.test.ts`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useRoomState.ts frontend/src/hooks/useRoomState.test.ts
git commit -m "feat(frontend): add 1s-polling room state hook"
```

---

## Task 5: Match Reason Text Generator (spec §6.1)

**Files:**
- Create: `frontend/src/utils/matchReason.ts`
- Test: `frontend/src/utils/matchReason.test.ts`

**Interfaces:**
- Consumes: `ResultPlayer`, `PersonaScores` from `frontend/src/api/types.ts` (Task 2).
- Produces: `buildMatchReason(player: ResultPlayer) -> string`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/utils/matchReason.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildMatchReason } from "./matchReason";
import type { ResultPlayer } from "../api/types";

function player(overrides: Partial<ResultPlayer>): ResultPlayer {
  return {
    player_id: "p1",
    nickname: "정글짐",
    role: "police",
    is_alive: true,
    assigned_score: 82,
    assigned_by: "preference",
    persona_scores: { initiative: 30, analysis: 90, empathy: 40, caution: 60 },
    ...overrides,
  };
}

describe("buildMatchReason", () => {
  it("cites the highest-scoring axis for a preference-based assignment", () => {
    const reason = buildMatchReason(player({ role: "police" }));
    expect(reason).toContain("분석력 90");
    expect(reason).toContain("경찰");
  });

  it("uses fallback narrative language for a fallback mafia assignment", () => {
    const reason = buildMatchReason(
      player({ role: "mafia", assigned_by: "fallback_random" })
    );
    expect(reason).toContain("운명");
    expect(reason).toContain("마피아");
  });

  it("uses generic fallback narrative language for non-mafia fallback assignments", () => {
    const reason = buildMatchReason(
      player({ role: "citizen", assigned_by: "fallback_random" })
    );
    expect(reason).toContain("운명");
    expect(reason).toContain("시민");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/matchReason.test.ts`
Expected: FAIL — `Cannot find module './matchReason'`

- [ ] **Step 3: Implement the generator**

`frontend/src/utils/matchReason.ts`:
```ts
import type { PersonaScores, ResultPlayer } from "../api/types";

const AXIS_LABELS: Record<keyof PersonaScores, string> = {
  initiative: "주도성",
  analysis: "분석력",
  empathy: "공감력",
  caution: "신중함",
};

const ROLE_LABELS: Record<ResultPlayer["role"], string> = {
  mafia: "마피아",
  police: "경찰",
  doctor: "의사",
  citizen: "시민",
};

function topAxis(persona: PersonaScores): keyof PersonaScores {
  const axes = Object.keys(AXIS_LABELS) as (keyof PersonaScores)[];
  return axes.reduce((best, axis) => (persona[axis] > persona[best] ? axis : best), axes[0]);
}

export function buildMatchReason(player: ResultPlayer): string {
  const roleLabel = ROLE_LABELS[player.role];

  if (player.assigned_by === "fallback_random") {
    if (player.role === "mafia") {
      return "이번엔 아무도 어둠을 자처하지 않았습니다. 공감력이 가장 낮았던 당신에게 운명이 마피아를 맡겼습니다.";
    }
    return `뚜렷한 특기가 갈리지 않아, 운명이 당신을 ${roleLabel}(으)로 이끌었습니다.`;
  }

  const axis = topAxis(player.persona_scores);
  const value = player.persona_scores[axis];
  const label = AXIS_LABELS[axis];
  return `${label} ${value}(으)로 이 방에서 두드러졌던 당신, ${roleLabel}(으)로 발탁되었습니다.`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/matchReason.test.ts`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/matchReason.ts frontend/src/utils/matchReason.test.ts
git commit -m "feat(frontend): add spec §6.1 match-reason text generator"
```

---

## Task 6: Superlatives (spec §6.1)

**Files:**
- Create: `frontend/src/utils/superlatives.ts`
- Test: `frontend/src/utils/superlatives.test.ts`

**Interfaces:**
- Consumes: `ResultPlayer` from `frontend/src/api/types.ts` (Task 2).
- Produces: `Superlative` (`{ title: string, player: ResultPlayer }`), `computeSuperlatives(players: ResultPlayer[]) -> Superlative[]`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/utils/superlatives.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { computeSuperlatives } from "./superlatives";
import type { ResultPlayer } from "../api/types";

function player(overrides: Partial<ResultPlayer>): ResultPlayer {
  return {
    player_id: "p",
    nickname: "p",
    role: "citizen",
    is_alive: true,
    assigned_score: 50,
    assigned_by: "preference",
    persona_scores: { initiative: 50, analysis: 50, empathy: 50, caution: 50 },
    ...overrides,
  };
}

describe("computeSuperlatives", () => {
  it("returns an empty list for no players", () => {
    expect(computeSuperlatives([])).toEqual([]);
  });

  it("picks the highest mafia-formula score as 가장 마피아다웠던 사람", () => {
    const spiky = player({
      player_id: "spiky",
      persona_scores: { initiative: 100, analysis: 50, empathy: 0, caution: 100 },
    });
    const flat = player({ player_id: "flat" });
    const result = computeSuperlatives([flat, spiky]);
    const mafiaLike = result.find((s) => s.title === "가장 마피아다웠던 사람");
    expect(mafiaLike?.player.player_id).toBe("spiky");
  });

  it("picks the highest caution score as 가장 신중했던 사람", () => {
    const cautious = player({
      player_id: "cautious",
      persona_scores: { initiative: 50, analysis: 50, empathy: 50, caution: 99 },
    });
    const result = computeSuperlatives([player({ player_id: "other" }), cautious]);
    const mostCautious = result.find((s) => s.title === "가장 신중했던 사람");
    expect(mostCautious?.player.player_id).toBe("cautious");
  });

  it("includes 가장 의외의 반전 only when a fallback assignment exists", () => {
    const withFallback = computeSuperlatives([
      player({ player_id: "a" }),
      player({ player_id: "b", assigned_by: "fallback_random" }),
    ]);
    expect(withFallback.some((s) => s.title === "가장 의외의 반전")).toBe(true);

    const withoutFallback = computeSuperlatives([player({ player_id: "a" })]);
    expect(withoutFallback.some((s) => s.title === "가장 의외의 반전")).toBe(false);
  });

  it("includes 생존왕 only when someone is alive", () => {
    const alive = computeSuperlatives([player({ player_id: "a", is_alive: true })]);
    expect(alive.some((s) => s.title === "생존왕")).toBe(true);

    const allDead = computeSuperlatives([player({ player_id: "a", is_alive: false })]);
    expect(allDead.some((s) => s.title === "생존왕")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/superlatives.test.ts`
Expected: FAIL — `Cannot find module './superlatives'`

- [ ] **Step 3: Implement superlatives**

`frontend/src/utils/superlatives.ts`:
```ts
import type { PersonaScores, ResultPlayer } from "../api/types";

export interface Superlative {
  title: string;
  player: ResultPlayer;
}

// backend spec §3.2's mafia weight formula, ported here for display only —
// this never decides an actual role, it only ranks players for the "가장
// 마피아다웠던 사람" superlative on the result screen.
function mafiaLikeScore(persona: PersonaScores): number {
  return 0.4 * persona.initiative + 0.35 * (100 - persona.empathy) + 0.25 * persona.caution;
}

export function computeSuperlatives(players: ResultPlayer[]): Superlative[] {
  if (players.length === 0) return [];

  const mostMafiaLike = [...players].sort(
    (a, b) => mafiaLikeScore(b.persona_scores) - mafiaLikeScore(a.persona_scores)
  )[0];
  const mostCautious = [...players].sort(
    (a, b) => b.persona_scores.caution - a.persona_scores.caution
  )[0];
  const twist = players.find((p) => p.assigned_by === "fallback_random");
  const survivor = players.find((p) => p.is_alive);

  const superlatives: Superlative[] = [
    { title: "가장 마피아다웠던 사람", player: mostMafiaLike },
    { title: "가장 신중했던 사람", player: mostCautious },
  ];
  if (twist) {
    superlatives.push({ title: "가장 의외의 반전", player: twist });
  }
  if (survivor) {
    superlatives.push({ title: "생존왕", player: survivor });
  }
  return superlatives;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/superlatives.test.ts`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/superlatives.ts frontend/src/utils/superlatives.test.ts
git commit -m "feat(frontend): add spec §6.1 superlatives computation"
```

---

## Task 7: Persona Radar Chart

**Files:**
- Create: `frontend/src/components/PersonaRadarChart.tsx`
- Test: `frontend/src/components/PersonaRadarChart.test.tsx`

**Interfaces:**
- Consumes: `PersonaScores` from `frontend/src/api/types.ts` (Task 2).
- Produces: `personaToPolygonPoints(persona: PersonaScores) -> string` (pure geometry, exported for testing), `PersonaRadarChart({ persona }: { persona: PersonaScores })` (React component, inline SVG, no chart library).

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/PersonaRadarChart.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonaRadarChart, personaToPolygonPoints } from "./PersonaRadarChart";

describe("personaToPolygonPoints", () => {
  it("puts the first axis (initiative) straight up from center at max value", () => {
    const points = personaToPolygonPoints({ initiative: 100, analysis: 0, empathy: 0, caution: 0 });
    const [x, y] = points.split(" ")[0].split(",").map(Number);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(20);
  });

  it("collapses every point to the center when all scores are zero", () => {
    const points = personaToPolygonPoints({ initiative: 0, analysis: 0, empathy: 0, caution: 0 });
    for (const pair of points.split(" ")) {
      const [x, y] = pair.split(",").map(Number);
      expect(x).toBeCloseTo(100);
      expect(y).toBeCloseTo(100);
    }
  });
});

describe("PersonaRadarChart", () => {
  it("renders an accessible svg with all four axis labels", () => {
    render(
      <PersonaRadarChart persona={{ initiative: 82, analysis: 65, empathy: 40, caution: 55 }} />
    );
    expect(screen.getByRole("img", { name: "페르소나 성향 레이더 차트" })).toBeInTheDocument();
    expect(screen.getByText("주도성")).toBeInTheDocument();
    expect(screen.getByText("분석력")).toBeInTheDocument();
    expect(screen.getByText("공감력")).toBeInTheDocument();
    expect(screen.getByText("신중함")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/PersonaRadarChart.test.tsx`
Expected: FAIL — `Cannot find module './PersonaRadarChart'`

- [ ] **Step 3: Implement the chart**

`frontend/src/components/PersonaRadarChart.tsx`:
```tsx
import type { PersonaScores } from "../api/types";

const AXES: { key: keyof PersonaScores; label: string }[] = [
  { key: "initiative", label: "주도성" },
  { key: "analysis", label: "분석력" },
  { key: "empathy", label: "공감력" },
  { key: "caution", label: "신중함" },
];

const SIZE = 200;
const CENTER = SIZE / 2;
const MAX_RADIUS = 80;

function pointFor(index: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / AXES.length;
  const radius = (value / 100) * MAX_RADIUS;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
}

export function personaToPolygonPoints(persona: PersonaScores): string {
  return AXES.map((axis, i) => pointFor(i, persona[axis.key]).join(",")).join(" ");
}

export function PersonaRadarChart({ persona }: { persona: PersonaScores }) {
  const gridLevels = [25, 50, 75, 100];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label="페르소나 성향 레이더 차트"
    >
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={AXES.map((_, i) => pointFor(i, level).join(",")).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
        />
      ))}
      {AXES.map((axis, i) => {
        const [x, y] = pointFor(i, 100);
        return (
          <line key={axis.key} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.15} />
        );
      })}
      <polygon
        points={personaToPolygonPoints(persona)}
        fill="currentColor"
        fillOpacity={0.25}
        stroke="currentColor"
        strokeWidth={2}
      />
      {AXES.map((axis, i) => {
        const [x, y] = pointFor(i, 118);
        return (
          <text key={axis.key} x={x} y={y} fontSize={11} textAnchor="middle" dominantBaseline="middle">
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/PersonaRadarChart.test.tsx`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PersonaRadarChart.tsx frontend/src/components/PersonaRadarChart.test.tsx
git commit -m "feat(frontend): add inline-SVG persona radar chart"
```

---

## Task 8: Home Page (Create / Join Room)

**Files:**
- Create: `frontend/src/pages/HomePage.tsx`
- Test: `frontend/src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `createRoom`, `joinRoom` from `frontend/src/api/client.ts` (Task 2), `PlayerSession` from `frontend/src/hooks/usePlayerSession.ts` (Task 3).
- Produces: `HomePage({ onJoined: (session: PlayerSession) => void })`.

- [ ] **Step 1: Write the failing test**

`frontend/src/pages/HomePage.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";
import * as client from "../api/client";

describe("HomePage", () => {
  it("creates a room, joins as that room's first player, and reports the session", async () => {
    vi.spyOn(client, "createRoom").mockResolvedValue({ room_id: "room1" });
    vi.spyOn(client, "joinRoom").mockResolvedValue({ player_id: "p1", is_host: true });
    const onJoined = vi.fn();

    render(<HomePage onJoined={onJoined} />);
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "정글짐" } });
    fireEvent.click(screen.getByRole("button", { name: "방 만들기" }));

    await waitFor(() =>
      expect(onJoined).toHaveBeenCalledWith({ roomId: "room1", playerId: "p1", isHost: true })
    );
    expect(client.joinRoom).toHaveBeenCalledWith("room1", "정글짐");
  });

  it("joins an existing room by code", async () => {
    vi.spyOn(client, "joinRoom").mockResolvedValue({ player_id: "p2", is_host: false });
    const onJoined = vi.fn();

    render(<HomePage onJoined={onJoined} />);
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "손님" } });
    fireEvent.change(screen.getByPlaceholderText("방 코드"), { target: { value: "room9" } });
    fireEvent.click(screen.getByText("참가하기"));

    await waitFor(() =>
      expect(onJoined).toHaveBeenCalledWith({ roomId: "room9", playerId: "p2", isHost: false })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL — `Cannot find module './HomePage'`

- [ ] **Step 3: Implement the page**

`frontend/src/pages/HomePage.tsx`:
```tsx
import { useState } from "react";
import { createRoom, joinRoom } from "../api/client";
import type { PlayerSession } from "../hooks/usePlayerSession";

interface HomePageProps {
  onJoined: (session: PlayerSession) => void;
}

export function HomePage({ onJoined }: HomePageProps) {
  const [nickname, setNickname] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [playerCount, setPlayerCount] = useState(4);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    try {
      const { room_id } = await createRoom(playerCount);
      const { player_id, is_host } = await joinRoom(room_id, nickname);
      onJoined({ roomId: room_id, playerId: player_id, isHost: is_host });
    } catch (err) {
      setError(err instanceof Error ? err.message : "방 생성에 실패했습니다.");
    }
  };

  const handleJoin = async () => {
    setError(null);
    try {
      const { player_id, is_host } = await joinRoom(joinRoomId, nickname);
      onJoined({ roomId: joinRoomId, playerId: player_id, isHost: is_host });
    } catch (err) {
      setError(err instanceof Error ? err.message : "참가에 실패했습니다.");
    }
  };

  return (
    <div>
      <h1>마피아 게임</h1>
      <label>
        닉네임
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </label>

      <section>
        <h2>방 만들기</h2>
        <select value={playerCount} onChange={(e) => setPlayerCount(Number(e.target.value))}>
          <option value={4}>4인</option>
          <option value={5}>5인</option>
          <option value={6}>6인</option>
        </select>
        <button onClick={handleCreate} disabled={!nickname}>
          방 만들기
        </button>
      </section>

      <section>
        <h2>방 참가하기</h2>
        <input
          placeholder="방 코드"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
        />
        <button onClick={handleJoin} disabled={!nickname || !joinRoomId}>
          참가하기
        </button>
      </section>

      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/HomePage.tsx frontend/src/pages/HomePage.test.tsx
git commit -m "feat(frontend): add create/join room home page"
```

---

## Task 9: Waiting Room Page

**Files:**
- Create: `frontend/src/pages/WaitingRoomPage.tsx`
- Test: `frontend/src/pages/WaitingRoomPage.test.tsx`

**Interfaces:**
- Consumes: `startGame`, `submitMockPersona` from `frontend/src/api/client.ts` (Task 2), `PlayerSession` (Task 3), `RoomState` (Task 2).
- Produces: `WaitingRoomPage({ session: PlayerSession, state: RoomState })`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/WaitingRoomPage.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WaitingRoomPage } from "./WaitingRoomPage";
import * as client from "../api/client";
import type { RoomState } from "../api/types";

const baseState: RoomState = {
  phase: "WAITING_ROOM",
  day_number: 0,
  night_number: 0,
  host_player_id: "host1",
  player_count: 4,
  players: [
    { player_id: "host1", nickname: "방장", is_alive: true },
    { player_id: "p2", nickname: "손님", is_alive: true },
  ],
};

describe("WaitingRoomPage", () => {
  it("lets the host start the game once the room is full", () => {
    const full: RoomState = { ...baseState, player_count: 2 };
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "host1", isHost: true }} state={full} />);
    expect(screen.getByText("게임 시작")).not.toBeDisabled();
  });

  it("displays the room code so the host can share it with other players", () => {
    render(<WaitingRoomPage session={{ roomId: "room-xyz", playerId: "host1", isHost: true }} state={baseState} />);
    expect(screen.getByText("room-xyz")).toBeInTheDocument();
  });

  it("disables start for the host when the room is not yet full", () => {
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "host1", isHost: true }} state={baseState} />);
    expect(screen.getByText("게임 시작")).toBeDisabled();
  });

  it("shows a waiting message and no start button for a non-host", () => {
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "p2", isHost: false }} state={baseState} />);
    expect(screen.queryByText("게임 시작")).not.toBeInTheDocument();
    expect(screen.getByText("방장이 게임을 시작하길 기다리는 중...")).toBeInTheDocument();
  });

  it("lets the host fill mock persona data", async () => {
    const spy = vi.spyOn(client, "submitMockPersona").mockResolvedValue({ status: "ok" });
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "host1", isHost: true }} state={baseState} />);

    fireEvent.click(screen.getByText("무작위 성향 데이터 채우기 (테스트용)"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/WaitingRoomPage.test.tsx`
Expected: FAIL — `Cannot find module './WaitingRoomPage'`

- [ ] **Step 3: Implement the page**

`frontend/src/pages/WaitingRoomPage.tsx`:
```tsx
import { useState } from "react";
import { startGame, submitMockPersona } from "../api/client";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { RoomState } from "../api/types";

interface WaitingRoomPageProps {
  session: PlayerSession;
  state: RoomState;
}

export function WaitingRoomPage({ session, state }: WaitingRoomPageProps) {
  const [error, setError] = useState<string | null>(null);
  const isHost = state.host_player_id === session.playerId;
  const isFull = state.players.length === state.player_count;

  const handleFillMockPersona = async () => {
    setError(null);
    try {
      await submitMockPersona(session.roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "성향 데이터 생성에 실패했습니다.");
    }
  };

  const handleStart = async () => {
    setError(null);
    try {
      await startGame(session.roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "게임 시작에 실패했습니다.");
    }
  };

  return (
    <div>
      <h1>대기실</h1>
      <p>
        방 코드: <strong>{session.roomId}</strong>
      </p>
      <p>
        {state.players.length} / {state.player_count}명 참가 중
      </p>
      <ul>
        {state.players.map((p) => (
          <li key={p.player_id}>
            {p.nickname}
            {p.player_id === state.host_player_id ? " (방장)" : ""}
          </li>
        ))}
      </ul>

      {isHost ? (
        <>
          <button onClick={handleFillMockPersona}>무작위 성향 데이터 채우기 (테스트용)</button>
          <button onClick={handleStart} disabled={!isFull}>
            게임 시작
          </button>
        </>
      ) : (
        <p>방장이 게임을 시작하길 기다리는 중...</p>
      )}

      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/WaitingRoomPage.test.tsx`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/WaitingRoomPage.tsx frontend/src/pages/WaitingRoomPage.test.tsx
git commit -m "feat(frontend): add waiting room page with host controls"
```

---

## Task 10: Role Reveal Page

**Files:**
- Create: `frontend/src/pages/RoleRevealPage.tsx`
- Test: `frontend/src/pages/RoleRevealPage.test.tsx`

**Interfaces:**
- Consumes: `advancePhase` from `frontend/src/api/client.ts` (Task 2), `PlayerSession` (Task 3), `MyView` (Task 2).
- Produces: `RoleRevealPage({ session: PlayerSession, myView: MyView })`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/RoleRevealPage.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoleRevealPage } from "./RoleRevealPage";
import * as client from "../api/client";
import type { MyView } from "../api/types";

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
        myView={myView({ role: "doctor" })}
      />
    );
    expect(screen.getByTestId("role-label")).toHaveTextContent("의사");
  });

  it("shows fallback narrative language when assigned_by is fallback_random", () => {
    render(
      <RoleRevealPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        myView={myView({ assigned_by: "fallback_random" })}
      />
    );
    expect(screen.getByText("운명이 이 역할을 선택했습니다.")).toBeInTheDocument();
  });

  it("only the host sees the advance button, and it calls advancePhase", async () => {
    const spy = vi.spyOn(client, "advancePhase").mockResolvedValue({ phase: "DAY_DISCUSSION" });
    render(
      <RoleRevealPage session={{ roomId: "r1", playerId: "p1", isHost: true }} myView={myView({})} />
    );

    fireEvent.click(screen.getByText("모두 확인했다면 다음 단계로"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
  });

  it("a non-host does not see the advance button", () => {
    render(
      <RoleRevealPage session={{ roomId: "r1", playerId: "p1", isHost: false }} myView={myView({})} />
    );
    expect(screen.queryByText("모두 확인했다면 다음 단계로")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/RoleRevealPage.test.tsx`
Expected: FAIL — `Cannot find module './RoleRevealPage'`

- [ ] **Step 3: Implement the page**

`frontend/src/pages/RoleRevealPage.tsx`:
```tsx
import { advancePhase } from "../api/client";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { MyView, Role } from "../api/types";

const ROLE_LABELS: Record<Role, string> = {
  mafia: "마피아",
  police: "경찰",
  doctor: "의사",
  citizen: "시민",
};

interface RoleRevealPageProps {
  session: PlayerSession;
  myView: MyView;
}

export function RoleRevealPage({ session, myView }: RoleRevealPageProps) {
  const handleAdvance = () => {
    advancePhase(session.roomId);
  };

  return (
    <div>
      <h1>당신의 직업</h1>
      <p data-testid="role-label">{myView.role ? ROLE_LABELS[myView.role] : "배정 중..."}</p>
      {myView.assigned_by === "fallback_random" && <p>운명이 이 역할을 선택했습니다.</p>}
      {session.isHost && <button onClick={handleAdvance}>모두 확인했다면 다음 단계로</button>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/RoleRevealPage.test.tsx`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/RoleRevealPage.tsx frontend/src/pages/RoleRevealPage.test.tsx
git commit -m "feat(frontend): add private role reveal page"
```

---

## Task 11: Day Page (Discussion + Vote)

**Files:**
- Create: `frontend/src/pages/DayPage.tsx`
- Test: `frontend/src/pages/DayPage.test.tsx`

**Interfaces:**
- Consumes: `advancePhase`, `castVote` from `frontend/src/api/client.ts` (Task 2), `PlayerSession` (Task 3), `RoomState` (Task 2).
- Produces: `DayPage({ session: PlayerSession, state: RoomState })`, branching on `state.phase` (`DAY_DISCUSSION` vs `DAY_VOTE`).

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/DayPage.test.tsx`:
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
  it("shows discussion prompt and, for the host, an advance-to-vote button", async () => {
    const spy = vi.spyOn(client, "advancePhase").mockResolvedValue({ phase: "DAY_VOTE" });
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 1,
      night_number: 0,
      host_player_id: "p1",
      player_count: 3,
      players,
    };
    render(<DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />);

    fireEvent.click(screen.getByText("투표 시작"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
  });

  it("lists only alive players as vote targets and casts a vote on click", async () => {
    const spy = vi.spyOn(client, "castVote").mockResolvedValue({ status: "ok" });
    const state: RoomState = {
      phase: "DAY_VOTE",
      day_number: 1,
      night_number: 0,
      host_player_id: "p1",
      player_count: 3,
      players,
    };
    render(<DayPage session={{ roomId: "r1", playerId: "p2", isHost: false }} state={state} />);

    expect(screen.queryByText("죽음")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByText("지목하기")[0]);

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1", "p2", "p1"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/DayPage.test.tsx`
Expected: FAIL — `Cannot find module './DayPage'`

- [ ] **Step 3: Implement the page**

`frontend/src/pages/DayPage.tsx`:
```tsx
import { advancePhase, castVote } from "../api/client";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { RoomState } from "../api/types";

interface DayPageProps {
  session: PlayerSession;
  state: RoomState;
}

export function DayPage({ session, state }: DayPageProps) {
  const alivePlayers = state.players.filter((p) => p.is_alive);

  const handleVote = (targetId: string) => {
    castVote(session.roomId, session.playerId, targetId);
  };

  const handleAdvance = () => {
    advancePhase(session.roomId);
  };

  if (state.phase === "DAY_DISCUSSION") {
    return (
      <div>
        <h1>낮 {state.day_number}일차 - 토론</h1>
        <p>누가 마피아인지 이야기해보세요.</p>
        {session.isHost && <button onClick={handleAdvance}>투표 시작</button>}
      </div>
    );
  }

  return (
    <div>
      <h1>낮 {state.day_number}일차 - 투표</h1>
      <ul>
        {alivePlayers.map((p) => (
          <li key={p.player_id}>
            {p.nickname}
            <button onClick={() => handleVote(p.player_id)}>지목하기</button>
          </li>
        ))}
      </ul>
      {session.isHost && <button onClick={handleAdvance}>투표 마감</button>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/DayPage.test.tsx`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DayPage.tsx frontend/src/pages/DayPage.test.tsx
git commit -m "feat(frontend): add day discussion/vote page"
```

---

## Task 12: Night Page (Role-Gated Actions)

**Files:**
- Create: `frontend/src/pages/NightPage.tsx`
- Test: `frontend/src/pages/NightPage.test.tsx`

**Interfaces:**
- Consumes: `advancePhase`, `submitNightAction` from `frontend/src/api/client.ts` (Task 2), `PlayerSession` (Task 3), `RoomState`, `MyView` (Task 2).
- Produces: `NightPage({ session: PlayerSession, state: RoomState, myView: MyView })`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/NightPage.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NightPage } from "./NightPage";
import * as client from "../api/client";
import type { MyView, RoomState } from "../api/types";

const state: RoomState = {
  phase: "NIGHT_ACTION",
  day_number: 1,
  night_number: 1,
  host_player_id: "p1",
  player_count: 3,
  players: [
    { player_id: "p1", nickname: "마피아유저", is_alive: true },
    { player_id: "p2", nickname: "다른사람", is_alive: true },
    { player_id: "p3", nickname: "또다른사람", is_alive: true },
  ],
};

function myView(overrides: Partial<MyView>): MyView {
  return {
    player_id: "p1",
    nickname: "마피아유저",
    is_alive: true,
    role: "mafia",
    assigned_score: 70,
    assigned_by: "preference",
    investigation_result: null,
    ...overrides,
  };
}

describe("NightPage", () => {
  it("shows a waiting message for a citizen (no night action)", () => {
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p2", isHost: false }}
        state={state}
        myView={myView({ player_id: "p2", role: "citizen" })}
      />
    );
    expect(screen.getByText("밤이 되었습니다. 다른 사람들이 움직이는 동안 기다려주세요.")).toBeInTheDocument();
  });

  it("lets mafia pick a kill target and submits the kill action", async () => {
    const spy = vi.spyOn(client, "submitNightAction").mockResolvedValue({ status: "ok" });
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "mafia" })}
      />
    );

    fireEvent.click(screen.getAllByText("제거할 대상을 선택하세요")[0]);

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1", "p1", "kill", "p2"));
    expect(await screen.findByText("능력을 사용했습니다. 아침을 기다려주세요.")).toBeInTheDocument();
  });

  it("shows the police's investigation result from a previous night", () => {
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({
          role: "police",
          investigation_result: { police_id: "p1", target_id: "p2", is_mafia: true },
        })}
      />
    );
    expect(screen.getByText(/마피아입니다!/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/NightPage.test.tsx`
Expected: FAIL — `Cannot find module './NightPage'`

- [ ] **Step 3: Implement the page**

`frontend/src/pages/NightPage.tsx`:
```tsx
import { useState } from "react";
import { advancePhase, submitNightAction } from "../api/client";
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
  const alivePlayers = state.players.filter((p) => p.is_alive);
  const role = myView.role;
  const actionType = role ? ROLE_ACTION[role] : undefined;

  const handleAdvance = () => {
    advancePhase(session.roomId);
  };

  if (!actionType || !role) {
    return (
      <div>
        <h1>밤 {state.night_number}차</h1>
        <p>밤이 되었습니다. 다른 사람들이 움직이는 동안 기다려주세요.</p>
        {session.isHost && <button onClick={handleAdvance}>아침이 밝았습니다</button>}
      </div>
    );
  }

  const handleAct = async (targetId: string) => {
    await submitNightAction(session.roomId, session.playerId, actionType, targetId);
    setSubmitted(true);
  };

  const targets = alivePlayers.filter((p) => p.player_id !== session.playerId || role === "doctor");

  return (
    <div>
      <h1>밤 {state.night_number}차</h1>
      {myView.investigation_result && (
        <p>
          지난 밤 조사 결과: {myView.investigation_result.is_mafia ? "마피아입니다!" : "마피아가 아닙니다."}
        </p>
      )}
      {submitted ? (
        <p>능력을 사용했습니다. 아침을 기다려주세요.</p>
      ) : (
        <ul>
          {targets.map((p) => (
            <li key={p.player_id}>
              {p.nickname}
              <button onClick={() => handleAct(p.player_id)}>{ROLE_PROMPT[role]}</button>
            </li>
          ))}
        </ul>
      )}
      {session.isHost && <button onClick={handleAdvance}>아침이 밝았습니다</button>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/NightPage.test.tsx`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/NightPage.tsx frontend/src/pages/NightPage.test.tsx
git commit -m "feat(frontend): add role-gated night action page"
```

---

## Task 13: Result Page (spec §6 briefing)

**Files:**
- Create: `frontend/src/pages/ResultPage.tsx`
- Test: `frontend/src/pages/ResultPage.test.tsx`

**Interfaces:**
- Consumes: `getResult` (Task 2), `PersonaRadarChart` (Task 7), `buildMatchReason` (Task 5), `computeSuperlatives` (Task 6), `PlayerSession` (Task 3).
- Produces: `ResultPage({ session: PlayerSession })`.

- [ ] **Step 1: Write the failing test**

`frontend/src/pages/ResultPage.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultPage } from "./ResultPage";
import * as client from "../api/client";
import type { GameResult } from "../api/types";

const result: GameResult = {
  winner: "citizen",
  players: [
    {
      player_id: "p1",
      nickname: "정글짐",
      role: "police",
      is_alive: true,
      assigned_score: 82,
      assigned_by: "preference",
      persona_scores: { initiative: 30, analysis: 90, empathy: 40, caution: 60 },
    },
    {
      player_id: "p2",
      nickname: "라이트",
      role: "mafia",
      is_alive: false,
      assigned_score: 60,
      assigned_by: "fallback_random",
      persona_scores: { initiative: 40, analysis: 30, empathy: 20, caution: 50 },
    },
  ],
};

describe("ResultPage", () => {
  it("shows a loading state, then the winner, player cards, and superlatives", async () => {
    vi.spyOn(client, "getResult").mockResolvedValue(result);

    render(<ResultPage session={{ roomId: "r1", playerId: "p1", isHost: true }} />);
    expect(screen.getByText("결과를 불러오는 중...")).toBeInTheDocument();

    expect(await screen.findByText("시민 팀 승리!")).toBeInTheDocument();
    expect(screen.getByText("정글짐 - 경찰")).toBeInTheDocument();
    expect(screen.getByText("라이트 - 마피아")).toBeInTheDocument();
    expect(screen.getByText(/분석력 90/)).toBeInTheDocument();
    expect(screen.getByText(/가장 마피아다웠던 사람/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/ResultPage.test.tsx`
Expected: FAIL — `Cannot find module './ResultPage'`

- [ ] **Step 3: Implement the page**

`frontend/src/pages/ResultPage.tsx`:
```tsx
import { useEffect, useState } from "react";
import { getResult } from "../api/client";
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

  useEffect(() => {
    getResult(session.roomId).then(setResult);
  }, [session.roomId]);

  if (!result) {
    return <p>결과를 불러오는 중...</p>;
  }

  const superlatives = computeSuperlatives(result.players);

  return (
    <div>
      <h1>{result.winner === "mafia" ? "마피아 팀 승리!" : "시민 팀 승리!"}</h1>

      <section>
        <h2>시상식</h2>
        <ul>
          {superlatives.map((s) => (
            <li key={s.title}>
              {s.title}: {s.player.nickname}
            </li>
          ))}
        </ul>
      </section>

      <section>
        {result.players.map((p) => (
          <article key={p.player_id}>
            <h3>
              {p.nickname} - {ROLE_LABELS[p.role]}
            </h3>
            <PersonaRadarChart persona={p.persona_scores} />
            <p>{buildMatchReason(p)}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/ResultPage.test.tsx`
Expected: PASS (1 passed)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ResultPage.tsx frontend/src/pages/ResultPage.test.tsx
git commit -m "feat(frontend): add spec §6 result briefing page"
```

---

## Task 14: App Phase Router + Manual End-to-End Verification

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: every page from Tasks 8–13, `usePlayerSession` (Task 3), `useRoomState` (Task 4), `getMyView` (Task 2).
- Produces: `App()` — the top-level component that renders the page matching the current session/phase.

- [ ] **Step 1: Write the failing tests**

`frontend/src/App.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import * as sessionHook from "./hooks/usePlayerSession";
import * as stateHook from "./hooks/useRoomState";
import * as client from "./api/client";

describe("App phase routing", () => {
  it("renders HomePage when there is no session", () => {
    vi.spyOn(sessionHook, "usePlayerSession").mockReturnValue({
      session: null,
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });

    render(<App />);
    expect(screen.getByText("마피아 게임")).toBeInTheDocument();
  });

  it("renders WaitingRoomPage when phase is WAITING_ROOM", () => {
    vi.spyOn(sessionHook, "usePlayerSession").mockReturnValue({
      session: { roomId: "r1", playerId: "p1", isHost: true },
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });
    vi.spyOn(stateHook, "useRoomState").mockReturnValue({
      state: {
        phase: "WAITING_ROOM",
        day_number: 0,
        night_number: 0,
        host_player_id: "p1",
        player_count: 4,
        players: [{ player_id: "p1", nickname: "정글짐", is_alive: true }],
      },
      error: null,
    });

    render(<App />);
    expect(screen.getByText("대기실")).toBeInTheDocument();
  });

  it("renders ResultPage and fetches the result when phase is RESULT", async () => {
    vi.spyOn(sessionHook, "usePlayerSession").mockReturnValue({
      session: { roomId: "r1", playerId: "p1", isHost: true },
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });
    vi.spyOn(stateHook, "useRoomState").mockReturnValue({
      state: {
        phase: "RESULT",
        day_number: 2,
        night_number: 1,
        host_player_id: "p1",
        player_count: 4,
        players: [],
      },
      error: null,
    });
    vi.spyOn(client, "getResult").mockResolvedValue({ winner: "citizen", players: [] });

    render(<App />);
    expect(screen.getByText("결과를 불러오는 중...")).toBeInTheDocument();

    // Flush the pending getResult().then(setResult) update inside act()
    // so React doesn't warn about a state update outside a test wrapper.
    await waitFor(() => expect(client.getResult).toHaveBeenCalledWith("r1"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — the placeholder `App` from Task 1 always renders `<div>Mafia Game</div>`, so `WaitingRoomPage`/`ResultPage` assertions fail.

- [ ] **Step 3: Implement phase routing**

`frontend/src/App.tsx`:
```tsx
import { useEffect, useState } from "react";
import { HomePage } from "./pages/HomePage";
import { WaitingRoomPage } from "./pages/WaitingRoomPage";
import { RoleRevealPage } from "./pages/RoleRevealPage";
import { DayPage } from "./pages/DayPage";
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
  "NIGHT_ACTION",
];

export function App() {
  const { session, setSession } = usePlayerSession();
  const { state } = useRoomState(session?.roomId ?? null);
  const [myView, setMyView] = useState<MyView | null>(null);

  useEffect(() => {
    if (!session || !state) return;
    if (!ROLE_REVEALED_PHASES.includes(state.phase)) return;
    getMyView(session.roomId, session.playerId).then(setMyView);
  }, [session, state?.phase]);

  if (!session) {
    return <HomePage onJoined={setSession} />;
  }

  if (!state) {
    return <p>방 정보를 불러오는 중...</p>;
  }

  switch (state.phase) {
    case "WAITING_ROOM":
      return <WaitingRoomPage session={session} state={state} />;
    case "ROLE_ASSIGNMENT":
      return myView ? (
        <RoleRevealPage session={session} myView={myView} />
      ) : (
        <p>직업을 배정하는 중...</p>
      );
    case "DAY_DISCUSSION":
    case "DAY_VOTE":
      return <DayPage session={session} state={state} />;
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
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (3 passed)

- [ ] **Step 5: Run the full frontend test suite**

Run (from `frontend/`): `npm test`
Expected: all tests across Tasks 2–14 PASS.

- [ ] **Step 6: Manual end-to-end verification (real browser, real backend)**

This plan's automated tests mock the API client — they never prove the frontend and the real backend from `docs/superpowers/plans/2026-08-26-mafia-game-backend.md` agree on wire format. Do this manual pass before calling the feature done:

1. In one terminal (repo root): `uvicorn mafia_game.api.app:app --reload`
2. In another terminal (`frontend/`): `npm run dev`
3. Open 4 browser tabs at `http://localhost:5173` (one per player).
4. Tab 1: enter a nickname, create a 4인 room. Note the "방 코드" shown in the waiting room.
5. Tabs 2–4: join that same room code with different nicknames.
6. In Tab 1 (host): click "무작위 성향 데이터 채우기 (테스트용)", then "게임 시작" once all 4 have joined.
7. Each tab should independently show its own role in `RoleRevealPage` — confirm no tab can see another tab's role.
8. Host advances to discussion, then vote; each tab votes; confirm the eliminated player's tab shows `is_alive: false` reflected in later screens.
9. If the game reaches `NIGHT_ACTION`, confirm only the mafia/police/doctor tabs see action UI and citizen tabs see the wait screen; submit actions and have the host advance.
10. Confirm the game reaches `RESULT` in every tab, each showing the same winner, and that the radar chart + match reason text render without console errors in any tab's DevTools.

If any step disagrees with the automated tests' assumptions (e.g. a field name mismatch between the real FastAPI response and `api/types.ts`), fix `api/types.ts`/`api/client.ts` to match the real backend and re-run the affected task's tests before continuing.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "feat(frontend): wire phase-based routing across all pages"
```
