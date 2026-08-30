import { apiFetch } from './client'

export function getLiarState(code, playerId) {
  return apiFetch(`/rooms/${code}/liar/state?player_id=${encodeURIComponent(playerId)}`)
}

export function markLiarSeen(code, playerId) {
  return apiFetch(`/rooms/${code}/liar/seen`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}

export function nextLiarSpeaker(code) {
  return apiFetch(`/rooms/${code}/liar/next-speaker`, { method: 'POST' })
}

export function voteLiarContinue(code, playerId, more) {
  return apiFetch(`/rooms/${code}/liar/continue-vote`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, more }),
  })
}

export function accuseLiar(code, playerId, targetPlayerId) {
  return apiFetch(`/rooms/${code}/liar/accuse`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, target_player_id: targetPlayerId }),
  })
}

export function guessLiarWord(code, playerId, word) {
  return apiFetch(`/rooms/${code}/liar/word-guess`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, word }),
  })
}

export function nextLiarRound(code, playerId) {
  return apiFetch(`/rooms/${code}/liar/next`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}
