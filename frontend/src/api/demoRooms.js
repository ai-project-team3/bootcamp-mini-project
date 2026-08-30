import { apiFetch } from './client'

/**
 * Make a room.
 *
 * `sourceRoomCode` is the 얼음땡 session this group just finished, when they
 * came here from its report. The games look each player's abilities up from it
 * by nickname, so nobody re-enters anything — see the backend's
 * `services/persona_handoff`.
 */
export function createDemoRoom(nickname, sourceRoomCode = null) {
  return apiFetch('/demo/rooms', {
    method: 'POST',
    body: JSON.stringify({ nickname, source_room_code: sourceRoomCode }),
  })
}

export function getDemoRoom(code) {
  return apiFetch(`/demo/rooms/${code}`)
}

export function getDemoPlayers(code) {
  return apiFetch(`/demo/rooms/${code}/players`)
}

/**
 * What the 얼음땡 session measured about the people in this room.
 *
 * Read by the games that *show* a persona to a person — 너 누구야?, 너라면?.
 * 마피아 and 커플 브루마블 take the raw abilities through the launch instead,
 * because they compute with the numbers rather than display them. Comes back
 * empty when the group did not arrive from a finished session.
 */
export function getDemoRoomPersonas(code) {
  return apiFetch(`/demo/rooms/${code}/personas`)
}

export function joinDemoRoom(code, nickname) {
  return apiFetch(`/demo/rooms/${code}/players`, {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  })
}

/**
 * Demo-only: fill empty seats with bots so one person can test the whole flow.
 *
 * The bots play themselves once a game starts, so 마피아 resolves its votes and
 * 커플 브루마블's board keeps moving instead of stopping on an empty seat.
 */
export function fillDemoTestPlayers(code, playerId, count = 1) {
  return apiFetch(`/demo/rooms/${code}/test-players`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, count }),
  })
}

export function startDemoRoom(code, playerId) {
  return apiFetch(`/demo/rooms/${code}/start`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}

export function selectDemoGame(code, playerId, gameId) {
  return apiFetch(`/demo/rooms/${code}/game-selection`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, game_id: gameId }),
  })
}

export function startSelectedDemoGame(code, playerId) {
  return apiFetch(`/demo/rooms/${code}/game/start`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}

/**
 * Start a game that runs its own rooms, for everyone already in this one.
 *
 * Host only. The server builds the game's room around the current roster, so
 * nobody re-enters a nickname or an invite code. `options` carries settings the
 * game's own entry screen would have asked for — 커플 브루마블's 일반/19금 mode
 * — which a group coming from the shared room never gets to see.
 */
export function launchDemoGame(code, playerId, gameId, options = {}) {
  return apiFetch(`/demo/rooms/${code}/game-launch`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, game_id: gameId, options }),
  })
}

/** This player's own seat in the launched game. Nobody else's id is returned. */
export function claimLaunchedGame(code, playerId) {
  return apiFetch(`/demo/rooms/${code}/game-launch/claim`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}

/**
 * End the current game and reopen the room's game list, keeping the room.
 *
 * '게임 목록' is not '나가기': the room, its code and everyone in it stay, so
 * the group can pick something else without being invited all over again.
 */
export function returnToRoomHub(code, playerId) {
  return apiFetch(`/demo/rooms/${code}/game/back`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}

export function leaveDemoRoom(code, playerId) {
  return apiFetch(`/demo/rooms/${code}/leave`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}
