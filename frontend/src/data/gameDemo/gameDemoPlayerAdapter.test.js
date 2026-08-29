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

test('every game the room can pick has a playable guide', () => {
  const guides = guideData.GAME_GUIDES
  // 방에서 고를 수 있는 모든 게임 — 방 안에서 하는 8개와, 자기 방을 따로
  // 만드는 마피아·커플 브루마블. 어느 쪽이든 시작 전에 규칙을 먼저 보여준다.
  const everyGame = [
    'persona-impostor', 'persona-prediction', 'name-chain', 'category-market',
    'liar', 'charades', 'forbidden-word', 'telepathy',
    'mafia', 'marble',
  ]
  assert.equal(Object.keys(guides).length, everyGame.length)
  for (const id of everyGame) {
    assert.equal(guides[id].id, id)
    assert.ok(guides[id].goal)
    assert.ok(guides[id].steps.length >= 3)
    assert.ok(guides[id].rules.length >= 2)
  }
})

test('a player the icebreaking session measured gets their own persona', () => {
  const measured = {
    'room-2': { title: '중간을 찾는 사람', traits: ['공감', '조율'], scores: { EMP: 90 } },
  }

  const { personas } = adapter.adaptRoomPlayersForPersonaGames(ROOM_PLAYERS, PERSONA_TEMPLATES, measured)

  assert.equal(personas['room-2'].title, '중간을 찾는 사람')
  assert.deepEqual(personas['room-2'].traits, ['공감', '조율'])
  assert.equal(personas['room-2'].source, 'icebreaking')
})

test('a player it did not measure still gets something to play with', () => {
  const measured = {
    'room-2': { title: '중간을 찾는 사람', traits: ['공감'], scores: {} },
  }

  const { personas } = adapter.adaptRoomPlayersForPersonaGames(ROOM_PLAYERS, PERSONA_TEMPLATES, measured)

  assert.equal(personas['room-1'].source, 'demo')
  assert.equal(personas['room-1'].title, PERSONA_TEMPLATES[0].title)
})

test('with nothing measured every persona is a placeholder, as before', () => {
  const { personas } = adapter.adaptRoomPlayersForPersonaGames(ROOM_PLAYERS, PERSONA_TEMPLATES)

  assert.ok(Object.values(personas).every((p) => p.source === 'demo'))
})
