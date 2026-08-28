import { apiFetch } from './client'

export function joinRoom(code, nickname, gender, mbti) {
  return apiFetch(`/rooms/${code}/players`, {
    method: 'POST',
    body: JSON.stringify({ nickname, gender, mbti: mbti || null }),
  })
}

export function getPlayers(code) {
  return apiFetch(`/rooms/${code}/players`)
}
