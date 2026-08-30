import { writeMafiaSession } from '../mafia/hooks/usePlayerSession'
import { writeMarbleSession } from '../marble/hooks/useMarbleSession'

/**
 * The two games the shared room hands a whole group over to.
 *
 * Both keep their own rooms and their own player ids, so entering one means
 * writing that game's session for this player and then navigating into it.
 * Everything else in the catalog is played inside the shared room itself.
 */
const DESTINATIONS = {
  mafia: { path: '/games/mafia', writeSession: writeMafiaSession },
  marble: { path: '/games/marble', writeSession: writeMarbleSession },
}

/**
 * The game room this player has already been sent into, so someone who quits
 * and walks back to the room list is not shoved straight back in.
 *
 * Kept in `sessionStorage`, which is per tab, rather than `localStorage`, which
 * is shared by every tab of the same browser. Two players testing from two tabs
 * on one machine are two players: with a shared marker the first one in would
 * mark the launch as followed and the second would sit on the room list
 * forever, never entering the game.
 */
const FOLLOWED_KEY = 'roomGameLaunch.followed'

export function isLaunchableGame(gameId) {
  return Object.hasOwn(DESTINATIONS, gameId)
}

export function hasFollowedLaunch(gameRoomId) {
  try {
    return window.sessionStorage.getItem(FOLLOWED_KEY) === gameRoomId
  } catch {
    // Without storage the worst case is following the same launch twice, which
    // is still a working game — never a blocked one.
    return false
  }
}

function markLaunchFollowed(gameRoomId) {
  try {
    window.sessionStorage.setItem(FOLLOWED_KEY, gameRoomId)
  } catch {
    // Non-fatal, see above.
  }
}

/**
 * Seat this player in the game the host just started, and say where to go.
 *
 * `claim` is one player's own answer from `/game-launch/claim`: the game's room
 * code and the id they hold inside it. Writing it as that game's session is
 * what lets them land straight in the game's waiting room instead of on its
 * room-creation screen.
 */
export function enterLaunchedGame(claim) {
  const destination = DESTINATIONS[claim.game_id]
  if (!destination) return null
  destination.writeSession({
    roomId: claim.room_id,
    playerId: claim.player_id,
    isHost: claim.is_host,
  })
  markLaunchFollowed(claim.room_id)
  return destination.path
}
