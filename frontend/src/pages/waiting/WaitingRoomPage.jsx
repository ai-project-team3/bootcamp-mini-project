import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { getRoom, listParticipants, startRoom } from '../../api/rooms'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { findCategoryByCode } from '../../data/categories'
import './WaitingRoomPage.css'

const POLL_MS = 2000

export default function WaitingRoomPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { userId, setCategory } = useRoomFlow()
  const [room, setRoom] = useState(null)
  const [participants, setParticipants] = useState([])
  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(false)

  // Room and participants both come from the code in the URL rather than from
  // context, so a refresh lands back here intact. Plan doc §4-3.
  // The same poll doubles as the start signal: the host flips room.status and
  // everyone else follows it out of this screen. Plan doc §10-5.
  useEffect(() => {
    let cancelled = false
    let timer

    const tick = async () => {
      try {
        const [roomData, list] = await Promise.all([getRoom(code), listParticipants(code)])
        if (!cancelled) {
          setRoom(roomData)
          setCategory(findCategoryByCode(roomData.category))
          setParticipants(list)
          setError(null)
          if (roomData.status === 'IN_PROGRESS') {
            navigate(`/room/${code}/survey`)
            return
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS)
    }

    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [code, navigate, setCategory])

  const me = participants.find((p) => p.user_id === userId)
  const isHost = Boolean(me?.is_host)
  const category = room ? findCategoryByCode(room.category) : null
  // Two is the floor — a session of one has nobody to compare against. Below the
  // recommended size we warn but still let the host start, because plan doc §15
  // says an under-filled room degrades (skip the pairing stage) rather than
  // being blocked outright.
  const canStart = participants.length >= 2
  const belowRecommended = category ? participants.length < category.minSize : false

  const handleStart = async () => {
    setStarting(true)
    setError(null)
    try {
      await startRoom(code, userId)
      navigate(`/room/${code}/survey`)
    } catch (err) {
      setError(err.message)
      setStarting(false)
    }
  }

  return (
    <PhoneFrame>
      <TopBar title={`대기실 · ${code}`} />
      <h1 className="wr-title">{category ? `${category.label} 방 대기 중` : '대기 중'}</h1>
      <p className="wr-sub">
        {isHost ? '전원이 모이면 시작하세요' : '호스트가 시작하기를 기다리는 중이에요'}
      </p>

      <ul className="wr-list">
        {participants.map((p) => (
          <li key={p.id} className="wr-item">
            <span className="wr-avatar" aria-hidden>
              👤
            </span>
            <span>
              {p.nickname}
              {p.user_id === userId && ' (나)'}
            </span>
            {p.is_host && <span className="wr-host-tag">HOST</span>}
          </li>
        ))}
        {participants.length === 0 && <li className="wr-empty">불러오는 중…</li>}
      </ul>

      {belowRecommended && canStart && (
        <p className="wr-sub">
          {category.minSize}명부터 권장해요. 지금 시작하면 짝 맞추기 단계는 건너뜁니다
        </p>
      )}
      {!canStart && <p className="wr-sub">한 명 더 들어와야 시작할 수 있어요</p>}
      {error && <p className="wr-error">{error}</p>}

      {isHost ? (
        <Button onClick={handleStart} disabled={starting || !canStart}>
          {starting ? '시작하는 중…' : '시작'}
        </Button>
      ) : (
        <Button disabled>호스트 대기 중</Button>
      )}
    </PhoneFrame>
  )
}
