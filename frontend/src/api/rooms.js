import { apiFetch } from './client'

export function createRoom(nickname, gender, mbti, projectText, playerLimit) {
  return apiFetch('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      nickname,
      gender,
      mbti: mbti || null,
      project_text: projectText || '',
      player_limit: playerLimit ?? 5,
    }),
  })
}

export function getRoom(code) {
  return apiFetch(`/rooms/${code}`)
}

export function startRoom(code, playerId) {
  return apiFetch(`/rooms/${code}/start`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}

export function regenerateQuestions(code, playerId) {
  return apiFetch(`/rooms/${code}/regenerate-questions`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}
