import { apiFetch } from './client'

export function getQuestions(code) {
  return apiFetch(`/rooms/${code}/questions`)
}
