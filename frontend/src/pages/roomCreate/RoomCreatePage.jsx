import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { createRoom } from '../../api/rooms'
import './RoomCreatePage.css'

export default function RoomCreatePage() {
  const navigate = useNavigate()
  const { nickname, category, roomCode, setRoomCode, setIsHost } = useRoomFlow()
  const [error, setError] = useState(null)

  useEffect(() => {
    if (roomCode) return
    setError(null)
    createRoom(category.code, nickname || '플레이어')
      .then((room) => {
        setIsHost(true)
        setRoomCode(room.code)
      })
      .catch((err) => setError(err.message))
  }, [category.code, nickname, roomCode, setIsHost, setRoomCode])

  const joinUrl = roomCode ? `${window.location.origin}/join/${roomCode}` : null

  const handleRetry = () => {
    setRoomCode(null)
  }

  const handleNext = () => {
    navigate(`/room/${roomCode}/waiting`)
  }

  return (
    <PhoneFrame>
      <TopBar title="3단계 · 방 만들기" />
      <h1 className="rc-title">
        {category.label} 방을
        <br />
        만들어요
      </h1>

      <Card className="rc-qr-card">
        {joinUrl ? (
          <QRCodeSVG value={joinUrl} size={140} bgColor="transparent" fgColor="var(--ink)" />
        ) : (
          <div className="rc-qr" aria-hidden>
            QR
          </div>
        )}
        <p className="rc-qr-hint">초대코드나 QR로 팀원을 부르세요</p>
      </Card>

      <Card>
        <span className="rc-code-label">초대코드</span>
        <span className="rc-code">{roomCode ?? (error ? '오류' : '생성 중...')}</span>
      </Card>

      {error && <p className="rc-error">{error}</p>}

      {error ? (
        <Button onClick={handleRetry}>다시 시도</Button>
      ) : (
        <Button onClick={handleNext} disabled={!roomCode}>
          방 만들기
        </Button>
      )}
    </PhoneFrame>
  )
}
