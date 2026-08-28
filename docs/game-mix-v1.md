# game-mixV1 — what is in this branch

`game-mixV1` on `ai-project-team3/bootcamp-mini-project` carries the two add-on
minigames (마피아, 커플 브루마블) merged with the party-game demo from the
`minwoo` branch, sitting on top of the team app. It branches from the team
history rather than replacing it, so merging it later does not lose anyone's
work. Nothing was merged into another branch to produce it.

## How a player moves through the app

```
/                     the app's end screen; 게임 바로가기 opens the list
/games                two groups — 페르소나 게임 / 파티 게임, each collapsible
/games/mafia          마피아          (own room)
/games/marble         커플 브루마블   (own room)
/games/demo           party games     (one demo room, then a game each)
/games/party/:gameId  the four games that need no room at all
```

Four party games — 이름 끝말잇기, 카테고리 시장에 가면, 몸으로 말해요, 통했나? —
are played by passing one phone, so they open straight from the list. The rest
need a screen per player and therefore a room.

## One room screen for every game

`src/components/room/` holds the room-creation and waiting-room markup that the
party games brought, and every game is drawn by it — including the party games
themselves, so there is one implementation rather than copies that drift.

A game hangs what only it needs in the layout's slots:

| game | options in the shared screen |
| --- | --- |
| party games | none |
| 마피아 | table size (4–8), from which the roles are dealt |
| 커플 브루마블 | 모드 (일반/19금), seats (2–8), a token per seat |

`tone="dark"` swaps the palette to the mafia game's own night theme: 마피아
always, 브루마블 in 19금 모드. The tokens are overridden on a wrapper element,
so a Card inside picks them up without either game restyling the shared parts.

## Leaving a game

'게임 목록' is the only way out of 마피아 and 브루마블, so the clean-up cannot
be walked around. It runs `resetMafiaGame` / `resetMarbleGame`:

1. `POST /mafia|marble/rooms/{id}/leave` releases the room. The host leaving
   closes it outright, which is what tells everyone else — their next poll
   404s, and their client already drops its session on a 404.
2. The stored session is cleared even if the server cannot be reached, so a
   player is never trapped in a game they quit.
3. The page navigates to `/games`; React state goes with the unmount.

Coming back therefore lands on an empty room-creation screen: the room has to
be made again and the players invited again.

## Running it

```
start.bat              backend on :8000, frontend on :5173, both on 0.0.0.0
```

Both bind to all interfaces so everyone can join from their own phone over the
same wifi at `http://<this PC's IP>:5173`. `cors_origin_regex` in
`backend/app/config.py` is what allows those LAN origins.

Rooms live in memory (`backend/app/mafia|marble/store.py`), so restarting the
backend ends every game in progress. Clients handle that: the room 404s and
they return to room creation.

## Tests

```
cd backend  && pytest        238 tests
cd frontend && npm test      189 tests
cd frontend && npx tsc -b    type-checks the .ts/.tsx half
```

The party games are JSX and the two minigames are TypeScript; both compile in
one Vite app. `vite.config.js` sets the JSX runtime explicitly because the
React plugin does not configure it for the transform vitest uses.
