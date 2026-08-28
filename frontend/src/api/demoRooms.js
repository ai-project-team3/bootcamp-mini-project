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

export function leaveDemoRoom(code, playerId) {
  return apiFetch(`/demo/rooms/${code}/leave`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}
