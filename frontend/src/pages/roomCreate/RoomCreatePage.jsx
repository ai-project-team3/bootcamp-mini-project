import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { generateRoomCode } from './generateRoomCode'
import './RoomCreatePage.css'

export default function RoomCreatePage() {
  const navigate = useNavigate()
  const { category, roomCode, setRoomCode } = useRoomFlow()

  const handleCreate = () => {
    const code = roomCode ?? generateRoomCode()
    setRoomCode(code)
    navigate(`/room/${code}/waiting`)
  }

  return (
    <PhoneFrame>
      <TopBar title="2단계 · 방 만들기" />
      <h1 className="rc-title">
        {category.label} 방을
        <br />
        만들어요
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

      <Button onClick={handleCreate}>방 만들기</Button>
    </PhoneFrame>
  )
}
