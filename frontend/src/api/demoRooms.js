import { apiFetch } from './client'

export function createDemoRoom(nickname) {
  return apiFetch('/demo/rooms', {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  })
}

export function getDemoRoom(code) {
  return apiFetch(`/demo/rooms/${code}`)
}

export function getDemoPlayers(code) {
  return apiFetch(`/demo/rooms/${code}/players`)
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

export function leaveDemoRoom(code, playerId) {
  return apiFetch(`/demo/rooms/${code}/leave`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}
