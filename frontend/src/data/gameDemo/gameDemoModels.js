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
