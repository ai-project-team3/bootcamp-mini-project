import { apiFetch } from './client'

export function getTraitOptions(code) {
  return apiFetch(`/rooms/${code}/trait/options`)
}

export function submitTraitSelf(code, playerId, optionIndex) {
  return apiFetch(`/rooms/${code}/trait/self`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, option_index: optionIndex }),
  })
}

export function getTraitTurn(code) {
  return apiFetch(`/rooms/${code}/trait/turn`)
}

export function submitTraitGuess(code, targetPlayerId, guesserId, optionIndex) {
  return apiFetch(`/rooms/${code}/trait/${targetPlayerId}/guess`, {
    method: 'POST',
    body: JSON.stringify({ guesser_id: guesserId, option_index: optionIndex }),
  })
}
