import { createContext, useContext } from 'react'

export const GameDemoContext = createContext(null)

export function useGameDemo() {
  const context = useContext(GameDemoContext)
  if (!context) throw new Error('useGameDemo must be used within GameDemoAccessGuard')
  return context
}
