import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ensureUser } from '../api/session'
import { DEFAULT_CATEGORY, findCategoryByCode } from '../data/categories'

const RoomFlowContext = createContext(null)

/**
 * Holds only what is convenient to pass between screens. It is not the source of
 * truth: the server is. Anything a page genuinely needs after a reload (the
 * room's category, the participant list) is fetched by that page from the room
 * code in the URL, because this state does not survive F5. Plan doc §4-3.
 */
export function RoomFlowProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userError, setUserError] = useState(null)
  const [category, setCategory] = useState(DEFAULT_CATEGORY)
  const [roomCode, setRoomCode] = useState(null)

  useEffect(() => {
    let cancelled = false
    ensureUser()
      .then((profile) => {
        if (!cancelled) setUser(profile)
      })
      .catch((err) => {
        if (!cancelled) setUserError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      setUser,
      userId: user?.user_id ?? null,
      userError,
      nickname: user?.nickname ?? '',
      category,
      setCategory,
      setCategoryByCode: (code) => setCategory(findCategoryByCode(code)),
      roomCode,
      setRoomCode,
    }),
    [user, userError, category, roomCode],
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
