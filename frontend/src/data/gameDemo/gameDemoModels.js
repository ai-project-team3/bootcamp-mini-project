export const DEMO_ROOM_MIN_PLAYERS = 2
export const DEMO_ROOM_MAX_PLAYERS = 10

export function canStartDemoRoom({ isHost, playerCount }) {
  return isHost && playerCount >= DEMO_ROOM_MIN_PLAYERS && playerCount <= DEMO_ROOM_MAX_PLAYERS
}

export function normalizeDemoNickname(value) {
  return value.trim()
}

export function normalizeDemoRoomCode(value) {
  return value.trim().toUpperCase()
}

export function withDemoRoomCode(path, roomCode) {
  if (!roomCode) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}room=${encodeURIComponent(roomCode)}`
}

export function getDemoHubPath(roomCode) {
  return roomCode ? `/games/demo/room/${encodeURIComponent(roomCode)}/games` : '/games/demo'
}

export function getSharedDemoGamePath({ code, gameId, gamePhase, path }) {
  if (!code || !gameId || gamePhase === 'HUB') return null
  const guidePath = `/games/demo/room/${encodeURIComponent(code)}/guide/${encodeURIComponent(gameId)}`
  if (gamePhase === 'GUIDE') return path === guidePath ? null : guidePath
  if (gamePhase === 'PLAYING') {
    const gamePath = gameId === 'persona-impostor'
      ? '/games/demo/persona-impostor'
      : gameId === 'persona-prediction'
        ? '/games/demo/persona-prediction'
        : `/games/demo/party?game=${encodeURIComponent(gameId)}`
    const destination = withDemoRoomCode(gamePath, code)
    return path === destination ? null : destination
  }
  return null
}

export function getPrivateDemoPlayerId(players, viewerId) {
  return players.some((player) => player.id === viewerId) ? viewerId : players[0]?.id
}

export function resolveDemoAccess({ contextRoomCode, playerId, requestedRoomCode, roomStatus }) {
  if (!playerId || contextRoomCode !== requestedRoomCode) return 'entry'
  return roomStatus === 'IN_PROGRESS' ? 'allowed' : 'waiting'
}

export function syncImpostorChoice(answers, ownerId, impostorId) {
  if (!(ownerId in answers)) return { ...answers }
  return { ...answers, [impostorId]: answers[ownerId] }
}

export function buildImpostorVotePairs(players) {
  return players.flatMap((impostor) => players
    .filter((owner) => owner.id !== impostor.id)
    .map((owner) => ({
      value: `${impostor.id}:${owner.id}`,
      impostorId: impostor.id,
      ownerId: owner.id,
      label: `${impostor.name} · ${owner.name} Persona`,
    })))
}

export function allPlayersLocked(answers, playerCount) {
  return Object.keys(answers).length === playerCount
}

export function groupMatchingAnswers(answers) {
  const groups = new Map()
  Object.entries(answers).forEach(([playerId, rawAnswer]) => {
    const answer = rawAnswer.trim()
    if (!answer) return
    if (!groups.has(answer)) groups.set(answer, [])
    groups.get(answer).push(playerId)
  })
  return [...groups].map(([answer, players]) => ({ answer, players }))
}

export function resolvePartyGameId(requestedId, catalog) {
  if (!requestedId) return null
  return catalog.some((game) => game.id === requestedId) ? requestedId : null
}

export function isPlayerAnswerLocked(answers, playerId) {
  return Object.hasOwn(answers, playerId)
}

export function getVisibleForbiddenAssignments(players, words, activePlayerId) {
  return players
    .map((player, index) => ({ playerId: player.id, playerName: player.name, word: words[index] }))
    .filter((assignment) => assignment.playerId !== activePlayerId)
}

export function buildForbiddenWordSet(pools, roundIndex) {
  const baseWords = [
    pools.high[roundIndex % pools.high.length],
    pools.medium[(roundIndex * 2) % pools.medium.length],
    pools.medium[(roundIndex * 2 + 1) % pools.medium.length],
    pools.topic[roundIndex % pools.topic.length],
  ]
  const shift = roundIndex % baseWords.length
  return baseWords.map((_, index) => baseWords[(index - shift + baseWords.length) % baseWords.length])
}
