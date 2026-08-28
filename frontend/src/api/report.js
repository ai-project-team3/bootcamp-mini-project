import { apiFetch } from './client'

export function getReport(code) {
  return apiFetch(`/rooms/${code}/report`)
}
