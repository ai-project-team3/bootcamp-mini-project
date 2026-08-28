import { apiFetch } from './client'

export function createRoom(nickname, gender, mbti) {
  return apiFetch('/rooms', {
    method: 'POST',
    body: JSON.stringify({ nickname, gender, mbti: mbti || null }),
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
