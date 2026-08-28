import { apiFetch } from './client'

export function submitImpression(code, round, playerId, votes) {
  return apiFetch(`/rooms/${code}/impressions/${round}`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, votes }),
  })
}

export function getImpressionStatus(code, round) {
  return apiFetch(`/rooms/${code}/impressions/${round}/status`)
}
