import { DEMO_GAME_CATALOG } from '../gameDemo/gameDemoData'
import { STANDALONE_GAMES } from './standaloneGames'

/**
 * Every game a gathered room can choose, in one list.
 *
 * There used to be two lists — all games before a room existed, and only the
 * ones that play inside the room after it did — which is what made picking a
 * game feel like starting over. This is the single source both screens read,
 * so a group sees the same catalog wherever they look at it.
 */
export const ROOM_GAME_GROUPS = [
  { key: 'Persona Games', label: '페르소나 게임' },
  { key: 'Party Games', label: '파티 게임' },
]

export const ROOM_GAME_CATALOG = [...STANDALONE_GAMES, ...DEMO_GAME_CATALOG]

export function roomGamesInGroup(groupKey) {
  return ROOM_GAME_CATALOG.filter((game) => game.group === groupKey)
}
