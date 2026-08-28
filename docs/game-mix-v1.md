# game-mixV1 — what is in this branch

`game-mixV1` on `ai-project-team3/bootcamp-mini-project` carries the two add-on
minigames (마피아, 커플 브루마블) merged with the party-game demo from the
`minwoo` branch, sitting on top of the team app. It branches from the team
history rather than replacing it, so merging it later does not lose anyone's
work. Nothing was merged into another branch to produce it.

## How a player moves through the app

People gather first and choose a game second. There is one room and one game
list, and the list is inside the room:

```
/                          the app's end screen; 게임 바로가기 opens room creation
/games/demo                make a room, or join one with an invite code
/games/demo/join/:code     what an invite link opens
/games/demo/room/:code     the waiting room — who is here, invite code, QR
/games/demo/room/:code/games   the host picks from every game, and everyone goes
/games                     a catalog of what exists; every room game leads back
                           to /games/demo, because a room comes first
/games/party/:gameId       the four games that need no room at all
```

From the room's list the host picks anything. Games that play inside the room
(너 누구야?, 너라면?, the party games) move everyone to the shared guide screen.
마피아 and 커플 브루마블 keep rooms of their own, so they are *launched*: the
server builds that game's room around the people already gathered, and each
player walks in holding their own id. Nobody re-enters a nickname or a code.

Four party games — 이름 끝말잇기, 카테고리 시장에 가면, 몸으로 말해요, 통했나? —
are played by passing one phone, so they open straight from the catalog. The
rest need a screen per player and therefore a room.

### Handing a group over to a game with its own rooms

```
host  POST /demo/rooms/{code}/game-launch        {player_id, game_id}
      -> builds a 마피아/브루마블 room seated with the whole roster
everyone  GET  /demo/rooms/{code}                -> launch: {game_id, room_id}
everyone  POST /demo/rooms/{code}/game-launch/claim  {player_id}
      -> that one player's id in the new room, and nobody else's
```

The id map never leaves the server whole, so knowing a room code is not enough
to play as somebody else. `backend/app/services/game_launch.py` is the registry;
each game builds its own room in `<game>/handoff.py`, so the shared room never
imports a game's models or store.

A game only opens if the group is the right size for it — 마피아 needs 4~8, so
with three people its card is greyed with the reason on it. The backend enforces
the same limits and answers with its own message.

A launched game may need a setting its own entry screen used to collect, which a
group coming from the shared room never sees. 커플 브루마블's 일반/19금 mode is
the one such setting today, so the confirm dialog asks for it and it travels in
`options` on the launch. `components/room/ContentModeChoice` is the single copy
of that choice, used by both the game's own lobby and the room's chooser.

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

The top-bar button is the only way out of 마피아 and 브루마블, so the clean-up
cannot be walked around. It runs `resetMafiaGame` / `resetMarbleGame`:

1. `POST /mafia|marble/rooms/{id}/leave` releases the game's room. The host
   leaving closes it outright, which is what tells everyone else — their next
   poll 404s, and their client already drops its session on a 404.
2. The stored session is cleared even if the server cannot be reached, so a
   player is never trapped in a game they quit.
3. React state goes with the unmount.

Where it lands depends on how the game was entered. A group that came from the
shared room goes back to that room's game list, still gathered and free to pick
something else — the game is torn down, the room is not. A player who opened
마피아 directly lands on room creation, with nothing left of the old game.

## One player, one tab

Both games keep their session in `sessionStorage`, not `localStorage`.
`localStorage` is shared by every tab of a browser, so two people testing from
two tabs on one laptop would share one seat: the second tab would find the first
player's session and never claim its own. `sessionStorage` is per tab, which is
what a player is, and it still survives a reload.

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
