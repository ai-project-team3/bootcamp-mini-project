import { describe, expect, it } from 'vitest'
import { playerCountBlocker, STANDALONE_GAMES } from './standaloneGames'

const mafia = STANDALONE_GAMES.find((game) => game.id === 'mafia')
const marble = STANDALONE_GAMES.find((game) => game.id === 'marble')

describe('whether a gathered group can start a game with its own room', () => {
  it('lets a group mafia has a role table for through', () => {
    expect(playerCountBlocker(mafia, 4)).toBeNull()
    expect(playerCountBlocker(mafia, 8)).toBeNull()
  })

  it('says why a group is too small or too large before anyone taps', () => {
    expect(playerCountBlocker(mafia, 3)).toContain('4명')
    expect(playerCountBlocker(mafia, 9)).toContain('8명')
    expect(playerCountBlocker(marble, 1)).toContain('2명')
    expect(playerCountBlocker(marble, 9)).toContain('8명')
  })

  it('has nothing to say about games played inside the shared room', () => {
    expect(playerCountBlocker({ id: 'liar' }, 20)).toBeNull()
  })
})
