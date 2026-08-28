import assert from 'node:assert/strict'
import test from 'node:test'

import * as adapter from './gameDemoPlayerAdapter.js'
import * as guideData from './gameGuideData.js'

const ROOM_PLAYERS = [
  { id: 'room-1', nickname: '민우', seat_no: 1, is_host: true },
  { id: 'room-2', nickname: '지수', seat_no: 2, is_host: false },
  { id: 'room-3', nickname: '현우', seat_no: 3, is_host: false },
  { id: 'room-4', nickname: '하나', seat_no: 4, is_host: false },
  { id: 'room-5', nickname: '다섯', seat_no: 5, is_host: false },
]

const PERSONA_TEMPLATES = [
  { title: '해결사', traits: ['결정', '도전'] },
  { title: '플래너', traits: ['계획', '안정'] },
]

test('room players keep their ids and nicknames while demo personas cycle by seat', () => {
  const result = adapter.adaptRoomPlayersForPersonaGames(ROOM_PLAYERS, PERSONA_TEMPLATES)

  assert.deepEqual(result.players.map(({ id, name }) => ({ id, name })), [
    { id: 'room-1', name: '민우' },
    { id: 'room-2', name: '지수' },
    { id: 'room-3', name: '현우' },
    { id: 'room-4', name: '하나' },
    { id: 'room-5', name: '다섯' },
  ])
  assert.equal(result.personas['room-1'].title, '해결사')
  assert.equal(result.personas['room-2'].title, '플래너')
  assert.equal(result.personas['room-3'].title, '해결사')
})

test('every catalog game has a playable guide', () => {
  const guides = guideData.GAME_GUIDES
  assert.equal(Object.keys(guides).length, 8)
  for (const id of ['persona-impostor', 'persona-prediction', 'name-chain', 'category-market', 'liar', 'charades', 'forbidden-word', 'telepathy']) {
    assert.equal(guides[id].id, id)
    assert.ok(guides[id].goal)
    assert.ok(guides[id].steps.length >= 3)
    assert.ok(guides[id].rules.length >= 2)
  }
})
