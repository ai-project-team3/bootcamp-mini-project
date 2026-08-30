# game-mixV1 — what is in this branch

`game-mixV1` on `ai-project-team3/bootcamp-mini-project` carries the two add-on
minigames (마피아, 커플 브루마블) merged with the party-game demo from the
`minwoo` branch, sitting on top of the team app. It branches from the team
history rather than replacing it, so merging it later does not lose anyone's
work. Nothing was merged into another branch to produce it.

## How a player moves through the app

These games come *after* 얼음땡, not instead of it: the app opens on 얼음땡, a
persona comes out of it, and the games that read that persona are picked up from
the report screen (plan doc §17). They keep their own room, so the group makes
one and gathers again with an invite code.

Within that part, people gather first and choose a game second. There is one
room and one game list, and the list is inside the room:

```
/                          where 얼음땡 begins — the app opens on it
/room/:code/hub            얼음땡's report screen; 게임 더 하기 opens room creation
/games/demo                make a room, or join one with an invite code
/games/demo/join/:code     what an invite link opens
/games/demo/room/:code     the waiting room — who is here, invite code, QR
/games/demo/room/:code/games   the host picks from every game, and everyone goes
/games                     a catalog of what exists; every room game leads back
                           to /games/demo, because a room comes first
/games/party/:gameId       the four games that need no room at all
```

From the room's list the host picks anything, and every game passes through its
guide first — 마피아 and 커플 브루마블 included, which used to drop the room
straight into play, so the two games with the most rules were the two nobody
was told the rules of. The guide is also where a game asks for anything its own
entry screen would have: 커플 브루마블's 일반/19금 mode is chosen there.

Starting from the guide differs by kind. Games that play inside the room (너
누구야?, 너라면?, the party games) simply begin. 마피아 and 커플 브루마블 keep
rooms of their own, so they are *launched*: the server builds that game's room
around the people already gathered, and each player walks in holding their own
id. Nobody re-enters a nickname or a code.

'게임 목록' inside any of those games ends the game and reopens the chooser.
The room, its code and everyone in it stay — leaving the room for good is a
separate button, on the game list itself.

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
the one such setting today, so the guide asks for it and it travels in `options`
on the launch. `components/room/ContentModeChoice` is the single copy of that
choice, used by both the game's own lobby and the guide.

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

## Testing it alone

Nobody has four phones, and 마피아 will not start below four players. The
waiting room therefore has two host-only buttons — 테스트 인원 한 명 추가 and
4명까지 채우기 — that fill seats with 테스트봇. Demo-only: a real group arrives
through the invite code.

The bots are not just placeholders, because a placeholder would break each game
differently:

- **커플 브루마블** waits on `current_player_id` and nothing else, so an
  unplayed bot turn stops the board for good. `marble/game/bots.py` plays one
  move per state poll — roll, answer, hand on — which is also why a watcher
  sees the turn happen rather than finding it already over.
- **마피아** has a clock, so it never deadlocks, but with silent bots every
  phase burns its full timer and nobody is ever executed or attacked, which
  tells a tester nothing. `mafia/game/bots.py` votes, votes on executions and
  takes night actions, so the game actually resolves. Choices are random on
  purpose: a bot that played well would make the human's own game harder to
  read.

`is_bot` travels with the player from the shared room into whichever game is
launched, so the bots keep playing on the other side of the handoff.

## One player, one tab, and a refresh that keeps the room

These games keep who you are in `context/GameRoomContext` and in each game's own
session, all in `sessionStorage`. 얼음땡 keeps its own in `RoomFlowContext`,
which is that side's file and is left exactly as it is.

Two contexts rather than one because the storage has to differ. `localStorage`
is shared by every tab of a browser; `sessionStorage` is per tab. These games
hand each player a different seat — a different role in 마피아, a different token
on the marble board — so two people testing from two tabs on one laptop have to
be two players, and a shared store would have the second tab take over the
first one's seat. 얼음땡 chose the browser-wide store, and that choice is theirs
to keep.

Stored at all, because a refresh used to throw the player out. The room lived
only in React state, so reloading any room screen left the app not knowing who
was asking, and it redirected to room creation — which read, from the outside,
as the room having been destroyed. A reload now lands back on the same page,
still in the room, mid-game included.

## The persona the run measured

얼음땡 measures five abilities — DOM 주도력 · SPD 순발력 · EXP 표현력 ·
EMP 공감력 · OBS 관찰력, 0~100 — and the games after it play from them. The run
computes them, so it owns the schema and the games map from it
(docs/페르소나-인계.md).

- **마피아** takes the five names as its own. Roles are dealt from them:
  a mafia is 주도적이면서 남을 덜 살피고 서두르지 않고 말수가 적은 쪽, a police
  는 관찰력, a doctor 는 공감력.
- **커플 브루마블** keeps its own four stats, because they are its vocabulary
  out loud — the board's tiles are LOGIC / EMPATHY / DRIVE / CAUTION and the
  quiz names them. It maps: logic←OBS, empathy←EMP, drive←DOM, caution←100−SPD.
  The quiz's trait answers (스트레스 해소법 등) are not something five numbers
  can produce, so those stay a preset, chosen as the closest to the stats.

- **너 누구야? / 너라면?** show a persona to a person rather than computing with
  it, so they read `GET /demo/rooms/{code}/personas` — a title and traits
  derived from each player's strongest ability, worded from the labels 얼음땡
  already uses for its roles. Without a session behind the room they fall back
  to the placeholder personas, and the `source` field says which it is. The
  other party games (라이어게임, 금지어, 몸으로 말해요, 통했나?, 이름 끝말잇기,
  카테고리 시장) use no persona at all.

The group re-gathers in a fresh room with fresh ids, so people are matched **by
nickname** (spaces and case ignored) against the session they came from — the
report's 게임 더 하기 carries its code along as `?from=`. Anyone the run never
saw plays with neutral 50s rather than being turned away, and the waiting room
says how many were found.

## Bots and the clock

The bots pace themselves, and both games needed it for the same reason from
opposite directions.

마피아 ends a phase as soon as everyone who *can* act has, and a phase's
required actors are often bots alone — the night needs only mafia, doctor and
police. Bots acting on the first poll meant a citizen never saw the night at
all. They now wait out `THINKING_FRACTION` of the phase. The host's 건너뛰기
takes their moves with it (`bots.act(force=True)`): without that a skipped vote
accused nobody and a skipped night attacked nobody, and day and night cycled
forever with nothing happening.

커플 브루마블 has no clock at all, so the risk is the opposite — its bot moves
are separated by `BOT_MOVE_INTERVAL_SECONDS` so the dice, the question and the
answer can each be read.

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
