import { createContext, useContext, useMemo, useState } from 'react'

const RoomFlowContext = createContext(null)

export function RoomFlowProvider({ children }) {
  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState('M')
  const [mbti, setMbti] = useState('')
  const [roomCode, setRoomCode] = useState(null)
  const [playerId, setPlayerId] = useState(null)
  const [isHost, setIsHost] = useState(true)

  const value = useMemo(
    () => ({
      nickname,
      setNickname,
      gender,
      setGender,
      mbti,
      setMbti,
      roomCode,
      setRoomCode,
      playerId,
      setPlayerId,
      isHost,
      setIsHost,
    }),
    [nickname, gender, mbti, roomCode, playerId, isHost],
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
