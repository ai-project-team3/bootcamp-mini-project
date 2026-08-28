import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { createRoom } from '../../api/rooms'
import { getPlayers } from '../../api/players'
import './RoomCreatePage.css'

export default function RoomCreatePage() {
  const navigate = useNavigate()
  const { nickname, gender, mbti, roomCode, setRoomCode, setPlayerId, setIsHost } = useRoomFlow()
  const [error, setError] = useState(null)

  useEffect(() => {
    if (roomCode) return
    setError(null)
    createRoom(nickname || '플레이어', gender, mbti)
      .then(async (room) => {
        setIsHost(true)
        const players = await getPlayers(room.code)
        setPlayerId(players[0]?.id ?? null)
        setRoomCode(room.code)
      })
      .catch((err) => setError(err.message))
  }, [nickname, gender, mbti, roomCode, setIsHost, setPlayerId, setRoomCode])

  const joinUrl = roomCode ? `${window.location.origin}/join/${roomCode}` : null

  const handleRetry = () => {
    setRoomCode(null)
  }

  const handleNext = () => {
    navigate(`/room/${roomCode}/waiting`)
  }

  return (
    <PhoneFrame>
      <TopBar title="방 만들기" />
      <h1 className="rc-title">
        얼음땡 방을
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
          대기실로 이동
        </Button>
      )}
    </PhoneFrame>
  )
}
