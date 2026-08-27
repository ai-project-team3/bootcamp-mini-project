import { apiFetch } from './client'

export function createRoom(category, hostNickname) {
  return apiFetch('/rooms', {
    method: 'POST',
    body: JSON.stringify({ category, host_nickname: hostNickname }),
  })
}

export function getRoom(code) {
  return apiFetch(`/rooms/${code}`)
}

export function joinRoom(code, nickname) {
  return apiFetch(`/rooms/${code}/participants`, {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  })
}

export function getParticipants(code) {
  return apiFetch(`/rooms/${code}/participants`)
}
