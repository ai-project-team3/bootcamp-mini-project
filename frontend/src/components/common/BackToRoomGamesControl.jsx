import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { returnToRoomHub } from '../../api/demoRooms'
import { useGameDemo } from '../../context/GameDemoContext'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getDemoHubPath } from '../../data/gameDemo/gameDemoModels'
import './GameDemoExitControl.css'

/**
 * The way back to the room's game list from inside a game.
 *
 * It ends the game for everyone and reopens the chooser — the room, its code
 * and its players all stay. There is deliberately no confirmation: nothing is
 * destroyed, so a dialog warning that the room will be broken up was both
 * frightening and untrue. Leaving the room for good is a separate button, on
 * the game list itself.
 */
export default function BackToRoomGamesControl({ label = '게임 목록' }) {
  const navigate = useNavigate()
  const { room, refresh } = useGameDemo()
  const { playerId } = useRoomFlow()
  const [leaving, setLeaving] = useState(false)

  const back = async () => {
    setLeaving(true)
    try {
      await returnToRoomHub(room.code, playerId)
      // Read the room back before moving: the guard sends anyone on the list
      // during a game back into it, and on stale state that is this player.
      await refresh?.()
    } catch {
      // The room may already be gone. Either way the player asked to see the
      // list, and the guard will sort out where they belong.
    }
    navigate(getDemoHubPath(room.code), { replace: true })
  }

  return (
    <button className="demo-exit-trigger" type="button" onClick={back} disabled={leaving}>
      {label}
    </button>
  )
}
