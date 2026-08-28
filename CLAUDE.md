# Language Policy

- When responding to the user, always reply in Korean (한국어).
- Documents intended for internal use only (e.g., design docs, plans, internal notes, code comments) should be written in English.
- User-facing content (UI copy, mock/demo data, API error messages returned to clients) stays in Korean — the policy above governs comments and internal docs, not product text.

# Tech Stack

- Frontend: React (Vite) + react-router-dom.
- Backend: FastAPI + SQLAlchemy.
- DB: MariaDB.
- The planning doc (`구현기획안.md` and friends) lives in a separate repository, not here. Don't copy plan documents into this repo — reference section numbers (e.g. "Plan doc §4-4") in comments instead of pasting content.

# Frontend Conventions

- One folder per screen under `src/pages/<page-name>/`, containing the page component plus its co-located `.css` file (and any sub-view components that only that page uses, e.g. `report/MyResultTab.jsx`). Don't group by file type (no global `components/pages` bucket).
- Reusable UI goes in `src/components/common/` (Button, Card, Tabs, Badge, ProgressBar); shared page chrome goes in `src/components/layout/` (PhoneFrame, TopBar). A component only moves out of a page folder once a second page needs it.
- Design tokens (colors, fonts, radii) live in `src/styles/theme.css` as CSS variables. Component styles are plain co-located CSS files that consume those variables — no CSS-in-JS, no inline style objects for anything beyond one-off dynamic values (e.g. a computed width).
- Cross-page flow state (nickname, selected category, room code) goes through `RoomFlowContext`, not prop drilling or query strings. Only promote state into the URL when it needs to be shareable/bookmarkable.
- Mock/demo data is isolated in `src/data/*.js`, kept separate from components so it's a one-line swap to a real API call later. Never inline placeholder data inside a component body.
- New pages get registered in `src/router/AppRouter.jsx` only — don't scatter `<Route>` definitions elsewhere.

# Backend Conventions

- One model per file under `app/models/`, one router per resource under `app/routers/`, matching Pydantic schemas under `app/schemas/`. `app/models/__init__.py` re-exports everything for `Base.metadata` discovery.
- Data model field names and primary keys should mirror the plan doc's contracts exactly (e.g. `AxisScore`'s composite PK from §4-4). If a field needs to diverge from the plan doc, that's a product decision — flag it, don't silently drift.
- Schema changes go through `app/init_db.py` (`Base.metadata.create_all`) during early development. Once the schema stabilizes, migrate to Alembic instead of hand-running `init_db`.
- Config/secrets go through `app/config.py` (`pydantic-settings`) reading from `.env`. Never hardcode connection strings or credentials in code.

# Add-on Minigames (mafia, couple marble)

The two minigames under `backend/app/mafia|marble/` and
`frontend/src/pages/mafia|marble/` are the 기획안 §17 "페르소나 이후 게임" part.
They are guests inside this app and must never disturb it:

- **Every route is namespaced** `/mafia/` or `/marble/`. The app already owns
  `/rooms` and the demo owns `/demo/rooms`.
- **Every CSS selector is scoped** under the game's root class (`.mafia-app`,
  `.pm-app`) and **every @keyframes is prefixed**. Neither game may style
  `html`, `body` or `#root`, or write to `document.documentElement` — an
  unscoped rule breaks the host's screens with no merge conflict to warn anyone.
- Each game keeps the app's skeleton *inside its own package*: `models/`,
  `schemas/`, `routers/`, `utils/` plus its rule packages. One folder per
  screen, holding the component, its co-located CSS and its test.
- **Chrome follows the app, palette follows the game.** Both games sit in
  `PhoneFrame` + `TopBar` like every other screen, so navigation feels the
  same. Inside that frame the mafia game keeps its dark night palette, and
  couple marble stays light in 일반 모드 and dark in 19금 모드.
- Client ids are never trusted: `utils/deps.py` resolves room and player before
  anything else, and role-restricted actions check the actor's role.
- These are the only TypeScript files in the app. Vite compiles `.tsx`
  alongside `.jsx` with no extra setup; `tsc -b` type-checks only them.
- Tests: `backend/tests/mafia|marble/` (pytest) and co-located `*.test.tsx`
  (vitest). Run with `cd backend && pytest` and `cd frontend && npm test`.

# Scope Discipline

- Don't implement game/scoring logic (survey grading, axis calculation, type/badge/compat determination, LLM report generation) ahead of an explicit request — those rules are still being finalized in the plan doc. Stubbed endpoints must return clearly-labeled mock data (see `app/routers/reports.py`) rather than a half-implemented version of the real algorithm.
- When scaffolding a new feature area, match the granularity already established here: many small, single-purpose files over few large ones.

# Secrets

- Never commit `.env` files (backend) or any real DB credentials. `.env.example` is the template that does get committed.
