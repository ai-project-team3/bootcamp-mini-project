import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { getDemoPlayers, getDemoRoom, startDemoRoom } from '../../api/demoRooms'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import GameDemoRoomHero from '../../components/common/GameDemoRoomHero'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { useRoomFlow } from '../../context/RoomFlowContext'
import {
  canStartDemoRoom,
  DEMO_ROOM_MAX_PLAYERS,
  DEMO_ROOM_MIN_PLAYERS,
} from '../../data/gameDemo/gameDemoModels'
import './GameDemoRoom.css'

const POLL_INTERVAL_MS = 1500

export default function GameDemoRoomPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { isHost, playerId, roomCode } = useRoomFlow()
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!playerId || roomCode !== code) return
    let cancelled = false
    const poll = async () => {
      try {
        const [room, nextPlayers] = await Promise.all([getDemoRoom(code), getDemoPlayers(code)])
        if (cancelled) return
        setPlayers(nextPlayers)
        setError('')
        if (room.status === 'IN_PROGRESS') {
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

  const inviteUrl = `${window.location.origin}/games/demo/join/${code}`
  const canStart = canStartDemoRoom({ isHost, playerCount: players.length })

  return (
    <PhoneFrame>
      <TopBar title={`게임방 · ${code}`} onBack={() => navigate('/games/demo')} />
      <GameDemoRoomHero eyebrow="WAITING ROOM" title={<>같이 놀 사람을<br />기다리고 있어요</>} compact>
        {players.length}/{DEMO_ROOM_MAX_PLAYERS}명 참여 · {DEMO_ROOM_MIN_PLAYERS}명부터 시작
      </GameDemoRoomHero>

      <Card className="game-room-invite-card">
        <QRCodeSVG value={inviteUrl} size={120} bgColor="transparent" fgColor="var(--ink)" />
        <div>
          <small>초대코드</small>
          <strong>{code}</strong>
          <button type="button" onClick={() => navigator.clipboard?.writeText(inviteUrl)}>초대 링크 복사</button>
        </div>
      </Card>

      <section className="game-room-player-section">
        <h2>참가자</h2>
        <ul className="game-room-player-list">
          {players.map((player) => (
            <li key={player.id}>
              <span aria-hidden>👤</span>
              <b>{player.nickname}</b>
              {player.is_host && <em>방장</em>}
              {player.id === playerId && <small>나</small>}
            </li>
          ))}
        </ul>
      </section>

      {error && <p className="game-room-error" role="alert">{error}</p>}
      {isHost ? (
        <Button onClick={handleStart} disabled={!canStart || starting}>
          {starting ? '시작하는 중...' : players.length < DEMO_ROOM_MIN_PLAYERS ? '한 명 더 기다려주세요' : '게임 선택 시작'}
        </Button>
      ) : (
        <Button variant="ghost" disabled>방장이 시작하기를 기다리는 중</Button>
      )}
    </PhoneFrame>
  )
}
