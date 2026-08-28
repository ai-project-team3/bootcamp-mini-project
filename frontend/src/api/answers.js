import { apiFetch } from './client'

export function submitAnswer(code, questionNo, playerId, choice, elapsedMs) {
  return apiFetch(`/rooms/${code}/answers/${questionNo}`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, choice, elapsed_ms: elapsedMs }),
  })
}

export function getAnswerStatus(code, questionNo) {
  return apiFetch(`/rooms/${code}/answers/${questionNo}/status`)
}
