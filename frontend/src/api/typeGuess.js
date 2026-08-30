import { apiFetch } from './client'

export function getCards(code, playerId) {
  return apiFetch(`/rooms/${code}/type-guess/cards?player_id=${playerId}`)
}

export function submitAssignment(code, playerId, assignments) {
  return apiFetch(`/rooms/${code}/type-guess/assign`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, assignments }),
  })
}

export function getAssignStatus(code, playerId) {
  return apiFetch(`/rooms/${code}/type-guess/status?player_id=${playerId}`)
}
