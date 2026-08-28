import { apiFetch } from './client'

export function submitSelfGuess(code, playerId, typeCode) {
  return apiFetch(`/rooms/${code}/type-guess/self`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, type_code: typeCode }),
  })
}

export function getSelfStatus(code) {
  return apiFetch(`/rooms/${code}/type-guess/self-status`)
}

export function getCards(code, playerId) {
  return apiFetch(`/rooms/${code}/type-guess/cards?player_id=${playerId}`)
}

export function submitAssignment(code, playerId, assignments) {
  return apiFetch(`/rooms/${code}/type-guess/assign`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, assignments }),
  })
}

export function getAssignStatus(code) {
  return apiFetch(`/rooms/${code}/type-guess/status`)
}
