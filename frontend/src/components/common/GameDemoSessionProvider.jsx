import { useMemo } from 'react'
import { GameDemoContext } from '../../context/GameDemoContext'

export default function GameDemoSessionProvider({ room, players, personas, children }) {
  const value = useMemo(() => ({ room, players, personas }), [room, players, personas])
  return <GameDemoContext.Provider value={value}>{children}</GameDemoContext.Provider>
}
