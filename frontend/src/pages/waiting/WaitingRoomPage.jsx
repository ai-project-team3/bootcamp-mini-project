import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { MOCK_PARTICIPANTS } from './mockParticipants'
import './WaitingRoomPage.css'

export default function WaitingRoomPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { nickname, category } = useRoomFlow()

  const participants = [nickname || '나', ...MOCK_PARTICIPANTS]

  const handleStart = () => {
    navigate(`/room/${code}/survey`)
  }

  return (
    <PhoneFrame>
      <TopBar title={`대기실 · ${code}`} />
      <h1 className="wr-title">{category.label} 방 대기 중</h1>
      <p className="wr-sub">전원이 모이면 호스트가 시작할 수 있어요</p>

      <ul className="wr-list">
        {participants.map((name, idx) => (
          <li key={name + idx} className="wr-item">
            <span className="wr-avatar" aria-hidden>
              👤
            </span>
            <span>{name}</span>
            {idx === 0 && <span className="wr-host-tag">HOST</span>}
          </li>
        ))}
      </ul>

      <Button onClick={handleStart}>시작</Button>
    </PhoneFrame>
  )
}
