# Language Policy

- When responding to the user, always reply in Korean (한국어).
- Documents intended for internal use only (design docs, plans, internal notes, code comments) are written in English. Existing Korean comments that document product behaviour may stay as they are.
- User-facing content (UI copy, mock/demo data, API error messages surfaced to players) stays in Korean.

# What this repo is

Two persona-driven minigames for a 6-person team project:

- **Mafia game** — `backend/app/mafia/`, `frontend/src/pages/mafia/`
- **Couple Marble** (페르소나 마블) — `backend/app/marble/`, `frontend/src/pages/marble/`

They are independent features. They never import each other, and neither one is
allowed to reach into the other's folder.

# Layout — both games are add-on features of CrewVerse

This repo merges into the team's base repo
`ai-project-team3/bootcamp-mini-project` (product name: **CrewVerse**). That repo
is not an empty skeleton — it is a working product with its own screen flow and
data model (`rooms`, `participants`, `axis_scores`, `compat_grades`). These
games are supplementary features there.

Each game therefore follows the CrewVerse backend skeleton *inside its own
package*, and owns a namespace nothing else touches:

```
backend/app/<game>/
  __init__.py   exports `routers` — mounting the game is a two-line change
  config.py     deploy-facing settings
  constants.py  domain constants
  store.py      in-memory room store (stands in for CrewVerse's database.py)
  models/       domain data
  schemas/      Pydantic request/response contracts
  routers/      endpoints, one module per resource, all prefixed /<game>/
  utils/        shared dependencies (deps.py, room_code.py)
  <rules>/      game logic packages (game/, roles/, persona/, validation/)

frontend/src/pages/<game>/
  <Game>App.tsx   the feature's root component
  <screen>/       one folder per screen: component + its .css + its test
  components/     shared UI for this game only
  api/ hooks/ utils/ assets/ styles/
```

Hard rules that keep a merge from breaking CrewVerse:

- **Every route is prefixed** `/mafia/` or `/marble/`. CrewVerse has its own
  `/rooms` endpoints; an unprefixed route would shadow them.
- **Every CSS selector is scoped** under the game's root class (`.mafia-app`,
  `.pm-app`) and **every `@keyframes` is prefixed**. This is not optional —
  CrewVerse defines `.btn`, `.btn-primary`, `.btn-secondary` with a completely
  different design, and an unscoped rule silently breaks their screens with no
  merge conflict to warn anyone.
- **Never style `html`, `body`, or `#root`,** and never write to
  `document.documentElement`. A game styles its own root element only.
- `backend/app/standalone.py`, `frontend/src/main.tsx`, and
  `frontend/src/standalone.css` exist only to run the games locally. CrewVerse's
  own entrypoints replace them. Deliberately **not** named `app/main.py` /
  `app/config.py`, because the host owns those.
- **Before adding a file, check whether the same path exists in the base repo.**
  Only `backend/requirements.txt`, `frontend/package.json`,
  `frontend/package-lock.json`, and `frontend/index.html` may collide — there is
  one of each per app, and they get reconciled by hand at merge time.

# Backend Conventions

- One router per resource; matching Pydantic schemas under `schemas/`. Routers
  stay thin: validate the request, call into the game logic, shape the response.
  Game rules never live in a router.
- **Every id from a client is validated before use.** `utils/deps.py` provides
  `get_room_or_404`, `get_player_or_404`, and (mafia) `get_living_player_or_400`.
  Reaching into `room.players[...]` with an unvalidated id is how the room used
  to crash with a 500. Role-restricted actions check the actor's role too — see
  `ROLE_NIGHT_ACTION`.
- Room codes come from `utils/room_code.py`: six characters, no `0O1I`, so a
  code can be read aloud across a table.
- Demo-only endpoints (`/persona/mock`, `/fill-test-players`) carry a docstring
  saying they are demo-only and how the real path differs.
- Tests live in `backend/tests/<game>/`, run with `cd backend && pytest`.

# Frontend Conventions

- One folder per screen, holding the component, its co-located `.css`, and its
  test. Don't group by file type.
- Design tokens live in `styles/theme.css` on the game's root class;
  `styles/global.css` imports it and defines the reset, typography, and shared
  primitives — all scoped.
- All backend calls go through the game's `api/client.ts`; components never call
  `fetch` directly. The API host comes from `src/shared/apiBase.ts`, which
  defaults to the host that served the page (so LAN play works) and can be
  overridden with `VITE_API_BASE`.
- Cross-screen state goes through the game's hooks, not prop drilling.

# Scope Discipline

- Persona scores are supplied by another team. Keep the mock provider and the
  real API path independent; don't hardcode assumptions about how scores are
  produced.
- Match the granularity already here: many small, single-purpose files.

# Secrets

- Never commit `.env` files or real credentials.
