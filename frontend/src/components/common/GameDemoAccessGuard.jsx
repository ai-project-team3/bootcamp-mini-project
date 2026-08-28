import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getDemoPlayers, getDemoRoom } from '../../api/demoRooms'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { DEMO_PERSONA_TEMPLATES } from '../../data/gameDemo/gameDemoData'
import { adaptRoomPlayersForPersonaGames } from '../../data/gameDemo/gameDemoPlayerAdapter'
import { getSharedDemoGamePath, resolveDemoAccess } from '../../data/gameDemo/gameDemoModels'
import { DemoNotice } from './GameDemoControls'
import PhoneFrame from '../layout/PhoneFrame'
import TopBar from '../layout/TopBar'
import GameDemoSessionProvider from './GameDemoSessionProvider'

export default function GameDemoAccessGuard({ children }) {
  const { code: pathRoomCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { roomCode: contextRoomCode, playerId } = useRoomFlow()
  const requestedRoomCode = pathRoomCode ?? searchParams.get('room') ?? ''
  const [room, setRoom] = useState(null)
  const [session, setSession] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!playerId || contextRoomCode !== requestedRoomCode) return
    let cancelled = false
    const poll = () => Promise.all([getDemoRoom(requestedRoomCode), getDemoPlayers(requestedRoomCode)])
      .then(([nextRoom, roomPlayers]) => {
        if (!cancelled) {
          setRoom(nextRoom)
          setSession(adaptRoomPlayersForPersonaGames(roomPlayers, DEMO_PERSONA_TEMPLATES))
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    poll()
    const timer = window.setInterval(poll, 1500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [contextRoomCode, playerId, requestedRoomCode])

  useEffect(() => {
    if (!room) return
    const sharedPath = getSharedDemoGamePath({
      code: requestedRoomCode,
      gameId: room.selected_game_id,
      gamePhase: room.game_phase,
      path: `${location.pathname}${location.search}`,
    })
    if (sharedPath) navigate(sharedPath, { replace: true })
  }, [location.pathname, location.search, navigate, requestedRoomCode, room])

  if (failed) return <Navigate to="/games/demo" replace />

  const access = resolveDemoAccess({ contextRoomCode, playerId, requestedRoomCode, roomStatus: room?.status ?? null })
  if (access === 'entry') return <Navigate to="/games/demo" replace />
  if (room === null || session === null) {
    return <PhoneFrame><TopBar title="게임 데모" showBack={false} /><DemoNotice>방 상태를 확인하고 있어요.</DemoNotice></PhoneFrame>
  }
  if (access === 'waiting') return <Navigate to={`/games/demo/room/${requestedRoomCode}`} replace />
  return (
    <GameDemoSessionProvider room={room} players={session.players} personas={session.personas}>
      {children}
    </GameDemoSessionProvider>
  )
}
