import { apiFetch } from './client'

export function submitStatements(code, playerId, statements) {
  return apiFetch(`/rooms/${code}/statements`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, statements }),
  })
}

export function getStatementsProgress(code) {
  return apiFetch(`/rooms/${code}/statements/progress`)
}

export function getTurn(code) {
  return apiFetch(`/rooms/${code}/statements/turn`)
}

export function submitLieGuess(code, targetPlayerId, guesserId, guessedSlot) {
  return apiFetch(`/rooms/${code}/statements/${targetPlayerId}/guess`, {
    method: 'POST',
    body: JSON.stringify({ guesser_id: guesserId, guessed_slot: guessedSlot }),
  })
}
