import assert from 'node:assert/strict'
import test from 'node:test'

import * as gameData from './gameDemoData.js'
import * as gameModels from './gameDemoModels.js'

const { allPlayersLocked, groupMatchingAnswers, syncImpostorChoice } = gameModels
const { DEMO_GAME_CATALOG } = gameData

test('demo room starts only for a host with 2 to 10 players', () => {
  assert.equal(gameModels.canStartDemoRoom({ isHost: true, playerCount: 1 }), false)
  assert.equal(gameModels.canStartDemoRoom({ isHost: true, playerCount: 2 }), true)
  assert.equal(gameModels.canStartDemoRoom({ isHost: true, playerCount: 10 }), true)
  assert.equal(gameModels.canStartDemoRoom({ isHost: true, playerCount: 11 }), false)
  assert.equal(gameModels.canStartDemoRoom({ isHost: false, playerCount: 4 }), false)
})

test('demo room entry trims nicknames and normalizes invite codes', () => {
  assert.equal(gameModels.normalizeDemoNickname('  민우  '), '민우')
  assert.equal(gameModels.normalizeDemoNickname('   '), '')
  assert.equal(gameModels.normalizeDemoRoomCode(' ab12cd '), 'AB12CD')
})

test('room-aware game links preserve an existing party game query', () => {
  assert.equal(
    gameModels.withDemoRoomCode('/games/demo/party?game=liar', 'AB12CD'),
    '/games/demo/party?game=liar&room=AB12CD',
  )
  assert.equal(
    gameModels.withDemoRoomCode('/games/demo/persona-impostor', 'AB12CD'),
    '/games/demo/persona-impostor?room=AB12CD',
  )
  assert.equal(gameModels.withDemoRoomCode('/games/demo/persona-impostor', ''), '/games/demo/persona-impostor')
})

test('game back navigation returns to the current room hub', () => {
  assert.equal(gameModels.getDemoHubPath('AB12CD'), '/games/demo/room/AB12CD/games')
  assert.equal(gameModels.getDemoHubPath(''), '/games/demo')
})

test('demo access requires membership and a started room', () => {
  assert.equal(gameModels.resolveDemoAccess({
    contextRoomCode: 'AB12CD', playerId: 'p1', requestedRoomCode: 'AB12CD', roomStatus: 'IN_PROGRESS',
  }), 'allowed')
  assert.equal(gameModels.resolveDemoAccess({
    contextRoomCode: 'AB12CD', playerId: 'p1', requestedRoomCode: 'AB12CD', roomStatus: 'WAITING',
  }), 'waiting')
  assert.equal(gameModels.resolveDemoAccess({
    contextRoomCode: 'OTHER', playerId: 'p1', requestedRoomCode: 'AB12CD', roomStatus: 'IN_PROGRESS',
  }), 'entry')
  assert.equal(gameModels.resolveDemoAccess({
    contextRoomCode: 'AB12CD', playerId: null, requestedRoomCode: 'AB12CD', roomStatus: 'IN_PROGRESS',
  }), 'entry')
})

test('shared game phase sends every member to the same guide or game route', () => {
  assert.equal(
    gameModels.getSharedDemoGamePath({ code: 'ABC123', gameId: 'liar', gamePhase: 'GUIDE', path: '/games/demo/room/ABC123/games' }),
    '/games/demo/room/ABC123/guide/liar',
  )
  assert.equal(
    gameModels.getSharedDemoGamePath({ code: 'ABC123', gameId: 'liar', gamePhase: 'PLAYING', path: '/games/demo/room/ABC123/guide/liar' }),
    '/games/demo/party?game=liar&room=ABC123',
  )
})

test('private games resolve the current room member instead of a selectable opponent', () => {
  const players = [{ id: 'host' }, { id: 'guest' }]
  assert.equal(gameModels.getPrivateDemoPlayerId(players, 'guest'), 'guest')
  assert.equal(gameModels.getPrivateDemoPlayerId(players, 'missing'), 'host')
})

test('impostor copies the stolen persona owner choice', () => {
  assert.deepEqual(syncImpostorChoice({ yuna: 1, jian: 2 }, 'yuna', 'seojun'), {
    yuna: 1, jian: 2, seojun: 1,
  })
})

test('impostor round keeps multiple questions before the final vote', () => {
  assert.ok(gameData.IMPOSTOR_QUESTIONS_PER_ROUND >= 3)
})

test('final vote exposes every valid impostor and stolen persona pair', () => {
  const pairs = gameModels.buildImpostorVotePairs(gameData.DEMO_PLAYERS)

  assert.equal(pairs.length, 12)
  assert.equal(new Set(pairs.map((pair) => pair.value)).size, 12)
  assert.ok(pairs.some((pair) => pair.value === 'seojun:jian'))
  pairs.forEach((pair) => assert.notEqual(pair.impostorId, pair.ownerId))
})

test('prediction locks only after every demo player answered', () => {
  assert.equal(allPlayersLocked({ seojun: 0, yuna: 1, jian: 2 }, 4), false)
  assert.equal(allPlayersLocked({ seojun: 0, yuna: 1, jian: 2, daon: 3 }, 4), true)
})

test('telepathy groups equal trimmed answers', () => {
  assert.deepEqual(groupMatchingAnswers({ seojun: '치킨', yuna: ' 치킨 ', jian: '족발', daon: '치킨' }), [
    { answer: '치킨', players: ['seojun', 'yuna', 'daon'] },
    { answer: '족발', players: ['jian'] },
  ])
})

test('demo hub exposes all eight owned games directly', () => {
  assert.equal(DEMO_GAME_CATALOG.length, 8)
  assert.equal(new Set(DEMO_GAME_CATALOG.map((game) => game.path)).size, 8)
})

test('only the five discussion games expose mild and spicy content', () => {
  assert.deepEqual(gameData.FLAVOR_GAME_IDS, [
    'persona-impostor',
    'persona-prediction',
    'liar',
    'charades',
    'telepathy',
  ])

  gameData.FLAVOR_GAME_IDS.forEach((gameId) => {
    const content = gameData.FLAVORED_GAME_CONTENT[gameId]
    assert.ok(content.mild.length >= 3)
    assert.ok(content.spicy.length >= 3)
    assert.notDeepEqual(content.mild, content.spicy)
  })
})

test('phone-down party games expose prompt cards instead of answer flows', () => {
  assert.deepEqual(Object.keys(gameData.PROMPT_ONLY_GAME_CONTENT), [
    'name-chain',
    'category-market',
    'forbidden-word',
  ])
  assert.ok(gameData.PROMPT_ONLY_GAME_CONTENT['name-chain'].length >= 4)
  assert.ok(gameData.PROMPT_ONLY_GAME_CONTENT['category-market'].length >= 4)
  assert.ok(gameData.PROMPT_ONLY_GAME_CONTENT['forbidden-word'].high.length >= 4)
  assert.ok(gameData.PROMPT_ONLY_GAME_CONTENT['forbidden-word'].medium.length >= 4)
  assert.ok(gameData.PROMPT_ONLY_GAME_CONTENT['forbidden-word'].topic.length >= 4)
})

test('party demo resolves only known game query ids', () => {
  assert.equal(gameModels.resolvePartyGameId('liar', gameData.PARTY_CATALOG), 'liar')
  assert.equal(gameModels.resolvePartyGameId(null, gameData.PARTY_CATALOG), null)
  assert.equal(gameModels.resolvePartyGameId('unknown', gameData.PARTY_CATALOG), null)
})

test('a submitted prediction answer is treated as private locked state', () => {
  assert.equal(gameModels.isPlayerAnswerLocked({ seojun: 0 }, 'seojun'), true)
  assert.equal(gameModels.isPlayerAnswerLocked({ seojun: 0 }, 'yuna'), false)
})

test('forbidden word view excludes the current player assignment', () => {
  assert.deepEqual(gameModels.getVisibleForbiddenAssignments(
    [
      { id: 'seojun', name: '서준' },
      { id: 'yuna', name: '유나' },
      { id: 'jian', name: '지안' },
      { id: 'daon', name: '다온' },
    ],
    ['진짜', '근데', '아니', '약간'],
    'yuna',
  ), [
    { playerId: 'seojun', playerName: '서준', word: '진짜' },
    { playerId: 'jian', playerName: '지안', word: '아니' },
    { playerId: 'daon', playerName: '다온', word: '약간' },
  ])
})

test('persona demo question banks keep their game-specific choice contracts', () => {
  const impostorQuestions = gameData.FLAVORED_GAME_CONTENT['persona-impostor']
  const predictionQuestions = gameData.FLAVORED_GAME_CONTENT['persona-prediction']
  const demoNames = ['유나', '서준', '지안', '다온']

  Object.values(impostorQuestions).flat().forEach((question) => {
    assert.equal(question.options.length, 3)
  })
  Object.values(predictionQuestions).flat().forEach((question) => {
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options).size, 4)
    assert.equal(demoNames.some((name) => question.text.includes(name)), false)
  })
})

test('prompt banks provide playable starts, commercial categories, and canonical actions', () => {
  const promptContent = gameData.PROMPT_ONLY_GAME_CONTENT
  const blockedEndings = new Set(['검', '희', '석'])

  assert.ok(promptContent['name-chain'].length >= 8)
  assert.equal(promptContent['name-chain'].some(({ starter }) => blockedEndings.has(starter.at(-1))), false)
  assert.ok(promptContent['category-market'].length >= 12)
  gameData.FLAVORED_GAME_CONTENT.charades.spicy.forEach((prompt) => {
    assert.ok(prompt.accepted.length >= 1)
    assert.ok(prompt.word.length <= 8)
  })
})

test('forbidden word rounds mix difficulty pools and rotate the hardest assignment', () => {
  assert.equal(typeof gameModels.buildForbiddenWordSet, 'function')
  const pools = {
    high: ['아니', '근데', '진짜', '그냥'],
    medium: ['약간', '일단', '사실', '원래', '뭔가', '솔직히', '아무튼', '그래서'],
    topic: ['친구', '오늘', '게임', '지금'],
  }
  const rounds = [0, 1, 2, 3].map((round) => gameModels.buildForbiddenWordSet(pools, round))

  rounds.forEach((words) => {
    assert.equal(words.filter((word) => pools.high.includes(word)).length, 1)
    assert.equal(words.filter((word) => pools.medium.includes(word)).length, 2)
    assert.equal(words.filter((word) => pools.topic.includes(word)).length, 1)
  })
  assert.deepEqual(rounds.map((words) => words.findIndex((word) => pools.high.includes(word))), [0, 1, 2, 3])
})
