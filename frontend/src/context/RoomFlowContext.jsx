import { createContext, useContext, useMemo, useState } from 'react'
import { DEFAULT_CATEGORY } from '../data/categories'

const RoomFlowContext = createContext(null)

export function RoomFlowProvider({ children }) {
  const [nickname, setNickname] = useState('')
  const [category, setCategory] = useState(DEFAULT_CATEGORY)
  const [roomCode, setRoomCode] = useState(null)
  const [isHost, setIsHost] = useState(true)

  const value = useMemo(
    () => ({
      nickname,
      setNickname,
      category,
      setCategory,
      roomCode,
      setRoomCode,
      isHost,
      setIsHost,
    }),
    [nickname, category, roomCode, isHost],
  )

  return <RoomFlowContext.Provider value={value}>{children}</RoomFlowContext.Provider>
}

export function useRoomFlow() {
  const ctx = useContext(RoomFlowContext)
  if (!ctx) {
    throw new Error('useRoomFlow must be used within RoomFlowProvider')
  }
  return ctx
}
