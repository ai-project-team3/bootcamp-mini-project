import { afterEach, describe, expect, it } from 'vitest'
import { enterLaunchedGame, hasFollowedLaunch, isLaunchableGame } from './launchedGames'
import { readMafiaSession } from '../mafia/hooks/usePlayerSession'
import { readMarbleSession } from '../marble/hooks/useMarbleSession'

afterEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('entering a game the room launched', () => {
  it('keeps the marker per tab, so two players on one machine both get in', () => {
    enterLaunchedGame({ game_id: 'mafia', room_id: 'ROOM01', player_id: 'p', is_host: true })

    // sessionStorage is per tab; localStorage would be shared by both players.
    expect(window.sessionStorage.getItem('roomGameLaunch.followed')).toBe('ROOM01')
    expect(window.localStorage.getItem('roomGameLaunch.followed')).toBeNull()
  })

  it('knows which games run rooms of their own', () => {
    expect(isLaunchableGame('mafia')).toBe(true)
    expect(isLaunchableGame('marble')).toBe(true)
    expect(isLaunchableGame('liar')).toBe(false)
  })

  it('seats the player in mafia without asking them for anything', () => {
    const path = enterLaunchedGame({
      game_id: 'mafia',
      room_id: 'ROOM01',
      player_id: 'mafia-p1',
      is_host: true,
    })

    expect(path).toBe('/games/mafia')
    expect(readMafiaSession()).toEqual({ roomId: 'ROOM01', playerId: 'mafia-p1', isHost: true })
  })

  it('seats the player in couple marble the same way', () => {
    const path = enterLaunchedGame({
      game_id: 'marble',
      room_id: 'ROOM02',
      player_id: 'marble-p3',
      is_host: false,
    })

    expect(path).toBe('/games/marble')
    expect(readMarbleSession()).toEqual({ roomId: 'ROOM02', playerId: 'marble-p3', isHost: false })
  })

  it('does not send anyone into a game it does not host', () => {
    expect(enterLaunchedGame({ game_id: 'liar', room_id: 'X', player_id: 'p', is_host: true })).toBeNull()
  })

  it('remembers a launch so quitting does not walk straight back in', () => {
    expect(hasFollowedLaunch('ROOM01')).toBe(false)

    enterLaunchedGame({ game_id: 'mafia', room_id: 'ROOM01', player_id: 'p', is_host: true })

    expect(hasFollowedLaunch('ROOM01')).toBe(true)
  })

  it('follows the next game the room starts', () => {
    enterLaunchedGame({ game_id: 'mafia', room_id: 'ROOM01', player_id: 'p', is_host: true })

    expect(hasFollowedLaunch('ROOM02')).toBe(false)
  })
})
