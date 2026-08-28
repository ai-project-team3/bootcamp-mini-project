const PLAYER_EMOJIS = ['⚡', '🌙', '💬', '👀', '🎯', '🧩', '🎨', '🎵', '🔥', '🌿']

export function adaptRoomPlayersForPersonaGames(roomPlayers, personaTemplates) {
  const players = roomPlayers.map((player, index) => ({
    id: player.id,
    name: player.nickname,
    emoji: PLAYER_EMOJIS[index % PLAYER_EMOJIS.length],
    seatNo: player.seat_no,
    isHost: player.is_host,
  }))
  const personas = Object.fromEntries(players.map((player, index) => [
    player.id,
    { ...personaTemplates[index % personaTemplates.length], source: 'demo' },
  ]))
  return { players, personas }
}
