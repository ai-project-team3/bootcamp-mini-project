import { apiFetch } from './client'

export function pressNunchi(code, playerId) {
  return apiFetch(`/rooms/${code}/nunchi/press`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}

export function getNunchiState(code, playerId) {
  return apiFetch(`/rooms/${code}/nunchi/state?player_id=${encodeURIComponent(playerId)}`)
}
