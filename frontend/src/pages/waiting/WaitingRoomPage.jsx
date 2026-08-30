import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getRoom, regenerateQuestions, startRoom } from '../../api/rooms'
import { getPlayers } from '../../api/players'
import './WaitingRoomPage.css'

const POLL_INTERVAL_MS = 2000

export default function WaitingRoomPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { isHost, playerId } = useRoomFlow()
  const [players, setPlayers] = useState([])
  const [room, setRoom] = useState(null)
  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenerateNote, setRegenerateNote] = useState(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const [roomData, list] = await Promise.all([getRoom(code), getPlayers(code)])
        if (cancelled) return
        setRoom(roomData)
        setPlayers(list)
        setError(null)
        if (roomData.status === 'IN_PROGRESS') {
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

  const handleRegenerate = async () => {
    setRegenerating(true)
    setRegenerateNote(null)
    setError(null)
    try {
      const updated = await regenerateQuestions(code, playerId)
      setRoom(updated)
      setRegenerateNote('새 문항을 만들었어요')
    } catch (err) {
      setError(err.message)
    } finally {
      setRegenerating(false)
      setTimeout(() => setRegenerateNote(null), 2500)
    }
  }

  return (
    <PhoneFrame>
      <TopBar title={`대기실 · ${code}`} />
      <h1 className="wr-title">얼음땡 방 대기 중</h1>
      <p className="wr-sub">
        {isHost
          ? `${players.length}/${room?.player_limit ?? '?'}명이 모이면 시작할 수 있어요`
          : '호스트가 시작하기를 기다리는 중이에요'}
      </p>
      {room?.team_kind && <p className="wr-team-kind">{room.team_kind}팀으로 잡았습니다</p>}

      {isHost && (
        <div className="wr-regenerate-row">
          <button
            type="button"
            className="wr-regenerate-btn"
            onClick={handleRegenerate}
            disabled={regenerating || starting}
          >
            {regenerating ? '문항 다시 만드는 중...' : '↻ 문항 다시 만들기'}
          </button>
          {regenerateNote && <span className="wr-regenerate-note">{regenerateNote}</span>}
        </div>
      )}

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

      {isHost && (
        <Button variant="ghost" onClick={handleRegenerate} disabled={regenerating || starting}>
          {regenerating ? '문항 다시 만드는 중...' : '문항 다시 만들기'}
        </Button>
      )}

      {isHost ? (
        <Button onClick={handleStart} disabled={players.length !== room?.player_limit || starting}>
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
