import { apiFetch } from './client'

export function getTelepathyRound(code, roundNo) {
  return apiFetch(`/rooms/${code}/telepathy/${roundNo}`)
}

export function submitTelepathy(code, roundNo, playerId, choice, predictedPlayerId) {
  return apiFetch(`/rooms/${code}/telepathy/${roundNo}`, {
    method: 'POST',
    body: JSON.stringify({
      player_id: playerId,
      choice,
      predicted_player_id: predictedPlayerId,
    }),
  })
}

export function getTelepathyStatus(code, roundNo) {
  return apiFetch(`/rooms/${code}/telepathy/${roundNo}/status`)
}
