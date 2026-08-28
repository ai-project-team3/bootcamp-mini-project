import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { claimLaunchedGame, getDemoPlayers, getDemoRoom } from '../../api/demoRooms'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { DEMO_PERSONA_TEMPLATES } from '../../data/gameDemo/gameDemoData'
import { adaptRoomPlayersForPersonaGames } from '../../data/gameDemo/gameDemoPlayerAdapter'
import { getSharedDemoGamePath, resolveDemoAccess } from '../../data/gameDemo/gameDemoModels'
import { DemoNotice } from './GameDemoControls'
import PhoneFrame from '../layout/PhoneFrame'
import TopBar from '../layout/TopBar'
import { enterLaunchedGame, hasFollowedLaunch } from '../../pages/minigames/launchedGames'
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

  // A game that runs its own rooms was started for the whole group. Everyone
  // polling the room finds out at the same time, claims their own id in the new
  // room and walks in — nobody is asked for a nickname or a code a second time.
  // A launch already followed is skipped, so quitting the game and coming back
  // to this list does not shove the player straight back into it.
  useEffect(() => {
    const launch = room?.launch
    if (!launch || !playerId || hasFollowedLaunch(launch.room_id)) return
    let cancelled = false
    claimLaunchedGame(requestedRoomCode, playerId)
      .then((claim) => {
        if (cancelled) return
        const destination = enterLaunchedGame(claim)
        if (destination) navigate(destination, { replace: true })
      })
      .catch(() => {
        // Claiming can fail for someone who joined after the launch. They stay
        // on this screen rather than being dropped out of the room.
      })
    return () => {
      cancelled = true
    }
  }, [navigate, playerId, requestedRoomCode, room?.launch?.room_id])

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
