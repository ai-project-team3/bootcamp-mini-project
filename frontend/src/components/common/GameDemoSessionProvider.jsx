import { useMemo } from 'react'
import { GameDemoContext } from '../../context/GameDemoContext'

/**
 * `refresh` re-reads the room now instead of waiting for the next poll. A
 * screen that has just changed the room server-side needs it: navigating on
 * stale state means the guard's redirect rule fires on the old phase and
 * bounces the player straight back where they came from.
 */
export default function GameDemoSessionProvider({ room, players, personas, refresh, children }) {
  const value = useMemo(
    () => ({ room, players, personas, refresh }),
    [room, players, personas, refresh],
  )
  return <GameDemoContext.Provider value={value}>{children}</GameDemoContext.Provider>
}
