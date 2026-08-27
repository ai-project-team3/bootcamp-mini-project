import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { joinRoom } from '../../api/rooms'
import { useRoomFlow } from '../../context/RoomFlowContext'
import './JoinPage.css'

export default function JoinPage() {
  const navigate = useNavigate()
  const { userId, setRoomCode } = useRoomFlow()
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 6 || !userId) return

    setJoining(true)
    setError(null)
    try {
      await joinRoom(trimmed, userId)
      setRoomCode(trimmed)
      navigate(`/room/${trimmed}/waiting`)
    } catch (err) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <PhoneFrame>
      <TopBar title="방 참여하기" />
      <div className="join-body">
        <h1 className="join-title">
          초대코드를
          <br />
          입력하세요
        </h1>
        <input
          className="join-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          inputMode="text"
          autoCapitalize="characters"
          aria-label="초대코드"
        />
        {error && <p className="join-error">{error}</p>}
      </div>

      <Button onClick={handleJoin} disabled={code.trim().length !== 6 || !userId || joining}>
        {joining ? '들어가는 중…' : '입장'}
      </Button>
    </PhoneFrame>
  )
}
