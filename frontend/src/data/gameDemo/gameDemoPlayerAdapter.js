const PLAYER_EMOJIS = ['⚡', '🌙', '💬', '👀', '🎯', '🧩', '🎨', '🎵', '🔥', '🌿']

/**
 * Shape the room's roster the way the persona games expect it.
 *
 * `measured` is what the 얼음땡 session found for these people, keyed by player
 * id (empty when the group did not come from one). A player it recognises gets
 * their own persona; anyone else falls back to a template, so a group that
 * skipped the run still has something to play with. The `source` field says
 * which happened, and the screens use it to say so out loud — a game about
 * reading each other is worth nothing if the personas are strangers'.
 */
export function adaptRoomPlayersForPersonaGames(roomPlayers, personaTemplates, measured = {}) {
  const players = roomPlayers.map((player, index) => ({
    id: player.id,
    name: player.nickname,
    emoji: PLAYER_EMOJIS[index % PLAYER_EMOJIS.length],
    seatNo: player.seat_no,
    isHost: player.is_host,
  }))
  const personas = Object.fromEntries(players.map((player, index) => {
    const real = measured[player.id]
    return [
      player.id,
      real
        ? { title: real.title, traits: real.traits, scores: real.scores, source: 'icebreaking' }
        : { ...personaTemplates[index % personaTemplates.length], source: 'demo' },
    ]
  }))
  return { players, personas }
}
