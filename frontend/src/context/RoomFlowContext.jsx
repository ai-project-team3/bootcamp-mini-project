import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const RoomFlowContext = createContext(null)

const KEY = 'icetag.session'

// Private-mode Safari and locked-down browsers throw on localStorage access
// rather than returning null, so every touch is guarded. Losing persistence is
// survivable; a thrown error on first render is not.
function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    /* storage unavailable — the session still works, it just won't survive a refresh */
  }
}

export function RoomFlowProvider({ children }) {
  const saved = useMemo(() => read(), [])
  const [nickname, setNickname] = useState(saved?.nickname ?? '')
  const [gender, setGender] = useState(saved?.gender ?? 'M')
  const [mbti, setMbti] = useState(saved?.mbti ?? '')
  const [roomCode, setRoomCode] = useState(saved?.roomCode ?? null)
  const [playerId, setPlayerId] = useState(saved?.playerId ?? null)
  const [isHost, setIsHost] = useState(saved?.isHost ?? true)

  // Plan doc §2 — without this a refresh drops playerId and that player can
  // never rejoin, which strands everyone else waiting on a submission that
  // will not arrive.
  useEffect(() => {
    write({ nickname, gender, mbti, roomCode, playerId, isHost })
  }, [nickname, gender, mbti, roomCode, playerId, isHost])

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
