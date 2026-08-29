import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fillDemoTestPlayers, getDemoPlayers, getDemoRoom, startDemoRoom } from '../../api/demoRooms'
import Button from '../../components/common/Button'
import GameDemoRoomHero from '../../components/common/GameDemoRoomHero'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import RoomWaitingLayout from '../../components/room/RoomWaitingLayout'
import { useGameRoom } from '../../context/GameRoomContext'
import {
  canStartDemoRoom,
  DEMO_ROOM_MAX_PLAYERS,
  DEMO_ROOM_MIN_PLAYERS,
} from '../../data/gameDemo/gameDemoModels'

const POLL_INTERVAL_MS = 1500

export default function GameDemoRoomPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { isHost, playerId, roomCode } = useGameRoom()
  const [players, setPlayers] = useState([])
  const [room, setRoom] = useState(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [filling, setFilling] = useState(false)

  useEffect(() => {
    if (!playerId || roomCode !== code) return
    let cancelled = false
    const poll = async () => {
      try {
        const [nextRoom, nextPlayers] = await Promise.all([getDemoRoom(code), getDemoPlayers(code)])
        if (cancelled) return
        setRoom(nextRoom)
        setPlayers(nextPlayers)
        setError('')
        if (nextRoom.status === 'IN_PROGRESS') {
          navigate(`/games/demo/room/${code}/games`, { replace: true })
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }
    poll()
    const timer = window.setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [code, navigate, playerId, roomCode])

  if (!playerId || roomCode !== code) {
    return (
      <PhoneFrame>
        <TopBar title="게임방" onBack={() => navigate('/games/demo')} />
        <GameDemoRoomHero eyebrow="SESSION EXPIRED" title="방 입장 정보가 없어요">
          닉네임을 다시 입력하고 방에 참가해주세요.
        </GameDemoRoomHero>
        <Button onClick={() => navigate(`/games/demo/join/${code}`)}>다시 참가하기</Button>
      </PhoneFrame>
    )
  }

  const handleStart = async () => {
    setStarting(true)
    setError('')
    try {
      await startDemoRoom(code, playerId)
      navigate(`/games/demo/room/${code}/games`, { replace: true })
    } catch (err) {
      setError(err.message)
      setStarting(false)
    }
  }

  // Demo-only: one person cannot hold four phones, and 마피아 will not start
  // below four. The bots play themselves once a game begins.
  const handleFill = async (count) => {
    setFilling(true)
    setError('')
    try {
      await fillDemoTestPlayers(code, playerId, count)
      setPlayers(await getDemoPlayers(code))
    } catch (err) {
      setError(err.message)
    } finally {
      setFilling(false)
    }
  }

  const inviteUrl = `${window.location.origin}/games/demo/join/${code}`
  const canStart = canStartDemoRoom({ isHost, playerCount: players.length })

  return (
    <PhoneFrame>
      <TopBar title={`게임방 · ${code}`} onBack={() => navigate('/games/demo')} />
      <RoomWaitingLayout
        title={<>같이 놀 사람을<br />기다리고 있어요</>}
        lead={`${players.length}/${DEMO_ROOM_MAX_PLAYERS}명 참여 · ${DEMO_ROOM_MIN_PLAYERS}명부터 시작`}
        code={code}
        inviteUrl={inviteUrl}
        players={players.map((player) => ({
          id: player.id,
          nickname: player.nickname,
          isHost: player.is_host,
          isMe: player.id === playerId,
        }))}
        error={error}
        notes={room?.source_room_code ? (
          <p>
            {room.persona_matches > 0
              ? `얼음땡에서 나온 성향으로 진행해요 · ${room.persona_matches}/${players.length}명 연결됨`
              : '얼음땡에서 쓰던 닉네임과 같아야 그때 나온 성향이 따라와요.'}
          </p>
        ) : null}
        hostTools={isHost ? (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleFill(1)}
              disabled={filling || players.length >= DEMO_ROOM_MAX_PLAYERS}
            >
              {filling ? '채우는 중...' : '테스트 인원 한 명 추가 (혼자 해볼 때)'}
            </button>
            {players.length < 4 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleFill(4 - players.length)}
                disabled={filling}
              >
                4명까지 채우기 (마피아 최소 인원)
              </button>
            )}
          </>
        ) : null}
        footer={isHost ? (
          <Button onClick={handleStart} disabled={!canStart || starting}>
            {starting ? '여는 중...' : players.length < DEMO_ROOM_MIN_PLAYERS ? '한 명 더 기다려주세요' : '게임 고르기'}
          </Button>
        ) : (
          <Button variant="ghost" disabled>방장이 게임을 고르기를 기다리는 중</Button>
        )}
      />
    </PhoneFrame>
  )
}
