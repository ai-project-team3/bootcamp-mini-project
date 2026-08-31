import { apiFetch } from './client'

export function getLanHost() {
  return apiFetch('/health/lan').then((d) => d.host ?? null)
}
