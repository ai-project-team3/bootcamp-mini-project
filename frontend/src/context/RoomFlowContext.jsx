import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const RoomFlowContext = createContext(null)

/**
 * Where the room flow keeps who you are.
 *
 * Persisted to `sessionStorage`, because a refresh used to throw the player
 * out: the room lived only in React state, so reloading any room screen left
 * the app with no idea who was asking and it redirected to room creation —
 * which read, from the outside, as the room having been destroyed. Reloading
 * now lands back on the same page, still in the room.
 *
 * `sessionStorage` and not `localStorage` for the same reason the games use it:
 * it is per tab, so two players testing from two tabs on one machine stay two
 * players. See `pages/mafia/hooks/usePlayerSession`.
 */
const STORAGE_KEY = 'roomFlow.session'

const EMPTY = {
  nickname: '',
  gender: 'M',
  mbti: '',
  roomCode: null,
  playerId: null,
  isHost: true,
}

function readStored() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    // A corrupt or unavailable store should not stop the app from starting.
    return EMPTY
  }
}

export function RoomFlowProvider({ children }) {
  const [stored] = useState(readStored)
  const [nickname, setNickname] = useState(stored.nickname)
  const [gender, setGender] = useState(stored.gender)
  const [mbti, setMbti] = useState(stored.mbti)
  const [roomCode, setRoomCode] = useState(stored.roomCode)
  const [playerId, setPlayerId] = useState(stored.playerId)
  const [isHost, setIsHost] = useState(stored.isHost)

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ nickname, gender, mbti, roomCode, playerId, isHost }),
      )
    } catch {
      // Non-fatal: the flow just will not survive a refresh.
    }
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
