import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getRoom, startRoom } from '../../api/rooms'
import { getPlayers } from '../../api/players'
import './WaitingRoomPage.css'

const POLL_INTERVAL_MS = 2000
const MAX_PLAYERS = 5

export default function WaitingRoomPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { isHost, playerId } = useRoomFlow()
  const [players, setPlayers] = useState([])
  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const [room, list] = await Promise.all([getRoom(code), getPlayers(code)])
        if (cancelled) return
        setPlayers(list)
        setError(null)
        if (room.status === 'IN_PROGRESS') {
          navigate(`/room/${code}/game`)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    poll()
    const timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [code, navigate])

  const handleStart = async () => {
    setStarting(true)
    setError(null)
    try {
      await startRoom(code, playerId)
      navigate(`/room/${code}/game`)
    } catch (err) {
      setError(err.message)
      setStarting(false)
    }
  }

  return (
    <PhoneFrame>
      <TopBar title={`대기실 · ${code}`} />
      <h1 className="wr-title">얼음땡 방 대기 중</h1>
      <p className="wr-sub">
        {isHost ? `${players.length}/${MAX_PLAYERS}명이 모이면 시작할 수 있어요` : '호스트가 시작하기를 기다리는 중이에요'}
      </p>

      {error && <p className="wr-error">{error}</p>}

      <ul className="wr-list">
        {players.map((p) => (
          <li key={p.id} className="wr-item">
            <span className="wr-avatar" aria-hidden>👤</span>
            <span>{p.nickname}</span>
            {p.is_host && <span className="wr-host-tag">HOST</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <Button onClick={handleStart} disabled={players.length !== MAX_PLAYERS || starting}>
          {starting ? '시작하는 중...' : '시작'}
        </Button>
      ) : (
        <Button variant="ghost" disabled>
          대기 중...
        </Button>
      )}
    </PhoneFrame>
  )
}
