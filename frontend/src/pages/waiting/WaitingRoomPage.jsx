import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getParticipants } from '../../api/rooms'
import './WaitingRoomPage.css'

const POLL_INTERVAL_MS = 2000

export default function WaitingRoomPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { category, isHost } = useRoomFlow()
  const [participants, setParticipants] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const poll = () => {
      getParticipants(code)
        .then((list) => {
          if (!cancelled) {
            setParticipants(list)
            setError(null)
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err.message)
        })
    }

    poll()
    const timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [code])

  const handleStart = () => {
    navigate(`/room/${code}/survey`)
  }

  return (
    <PhoneFrame>
      <TopBar title={`대기실 · ${code}`} />
      <h1 className="wr-title">{category.label} 방 대기 중</h1>
      <p className="wr-sub">
        {isHost ? '전원이 모이면 시작할 수 있어요' : '호스트가 시작하기를 기다리는 중이에요'}
      </p>

      {error && <p className="wr-error">{error}</p>}

      <ul className="wr-list">
        {participants.map((p) => (
          <li key={p.id} className="wr-item">
            <span className="wr-avatar" aria-hidden>
              👤
            </span>
            <span>{p.nickname}</span>
            {p.is_host && <span className="wr-host-tag">HOST</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <Button onClick={handleStart}>시작</Button>
      ) : (
        <Button variant="ghost" disabled>
          대기 중...
        </Button>
      )}
    </PhoneFrame>
  )
}
