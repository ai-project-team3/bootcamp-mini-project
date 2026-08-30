import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const GameRoomContext = createContext(null)

/**
 * Who you are in the games that come after 얼음땡.
 *
 * Separate from `RoomFlowContext`, which belongs to the icebreaking run and is
 * that side's to own. These games need the same three facts about a player, but
 * stored per tab rather than per browser: two people testing from two tabs on
 * one laptop are two players, and the minigames hand each of them a different
 * seat, so a store shared by every tab would have the second tab take over the
 * first one's identity.
 *
 * Storage access is guarded because private-mode browsers throw on it rather
 * than returning null; losing persistence is survivable, a crash on first
 * render is not. Persisting at all is what keeps a refresh from throwing a
 * player out of the room they are standing in.
 */
const STORAGE_KEY = 'gameRoom.session'

const EMPTY = { nickname: '', roomCode: null, playerId: null, isHost: true }

function read() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

function write(value) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* storage unavailable — the session just will not survive a refresh */
  }
}

export function GameRoomProvider({ children }) {
  const [saved] = useState(read)
  const [nickname, setNickname] = useState(saved.nickname)
  const [roomCode, setRoomCode] = useState(saved.roomCode)
  const [playerId, setPlayerId] = useState(saved.playerId)
  const [isHost, setIsHost] = useState(saved.isHost)

  useEffect(() => {
    write({ nickname, roomCode, playerId, isHost })
  }, [nickname, roomCode, playerId, isHost])

  const value = useMemo(
    () => ({ nickname, setNickname, roomCode, setRoomCode, playerId, setPlayerId, isHost, setIsHost }),
    [nickname, roomCode, playerId, isHost],
  )

  return <GameRoomContext.Provider value={value}>{children}</GameRoomContext.Provider>
}

export function useGameRoom() {
  const ctx = useContext(GameRoomContext)
  if (!ctx) {
    throw new Error('useGameRoom must be used within GameRoomProvider')
  }
  return ctx
}
