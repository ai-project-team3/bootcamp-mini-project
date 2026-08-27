import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { createRoom } from '../../api/rooms'
import { useRoomFlow } from '../../context/RoomFlowContext'
import './RoomCreatePage.css'

export default function RoomCreatePage() {
  const navigate = useNavigate()
  const { category, userId, roomCode, setRoomCode } = useRoomFlow()
  const [error, setError] = useState(null)
  // A ref rather than state: this only has to fire once, and StrictMode mounts
  // effects twice in development, which would otherwise create two rooms.
  const requested = useRef(false)

  // The room code comes from the server, never from the client. Two browsers
  // generating locally would eventually collide. Plan doc §12.
  useEffect(() => {
    if (!userId || roomCode || requested.current) return
    requested.current = true
    let cancelled = false
    createRoom({ category: category.code, userId })
      .then((room) => {
        if (!cancelled) setRoomCode(room.code)
      })
      .catch((err) => {
        if (!cancelled) {
          requested.current = false
          setError(err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [userId, roomCode, category.code, setRoomCode])

  return (
    <PhoneFrame>
      <TopBar title="방 만들기" />
      <h1 className="rc-title">
        {category.label} 방을
        <br />
        만들었어요
      </h1>

      <Card className="rc-qr-card">
        <div className="rc-qr" aria-hidden>
          QR
        </div>
        <p className="rc-qr-hint">초대코드나 QR로 팀원을 부르세요</p>
      </Card>

      <Card>
        <span className="rc-code-label">초대코드</span>
        <span className="rc-code">{roomCode ?? '- - - - - -'}</span>
      </Card>

      {error && <p className="rc-error">{error}</p>}

      <Button onClick={() => navigate(`/room/${roomCode}/waiting`)} disabled={!roomCode}>
        {roomCode ? '대기실로' : '방 만드는 중…'}
      </Button>
    </PhoneFrame>
  )
}
