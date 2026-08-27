import { api } from './client'

export function createRoom({ category, userId }) {
  return api.post('/rooms', { category, user_id: userId })
}

export function getRoom(code) {
  return api.get(`/rooms/${code}`)
}

export function startRoom(code, userId) {
  return api.post(`/rooms/${code}/start`, { user_id: userId })
}

export function joinRoom(code, userId) {
  return api.post(`/rooms/${code}/participants`, { user_id: userId })
}

export function listParticipants(code) {
  return api.get(`/rooms/${code}/participants`)
}

export function getSurveyItems(code) {
  return api.get(`/rooms/${code}/survey`)
}

export function submitSurvey(code, userId, answers) {
  return api.post(`/rooms/${code}/survey`, { user_id: userId, answers })
}

export function getSurveyState(code) {
  return api.get(`/rooms/${code}/survey/state`)
}
