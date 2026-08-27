import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { useRoomFlow } from '../../context/RoomFlowContext'
import './StartPage.css'

export default function StartPage() {
  const navigate = useNavigate()
  const { nickname, setNickname } = useRoomFlow()
  const [draft, setDraft] = useState(nickname)

  const handleNext = () => {
    setNickname(draft || '플레이어')
    navigate('/category')
  }

  return (
    <PhoneFrame>
      <TopBar showBack={false} title="CREWVERSE" />
      <div className="start-body">
        <h1 className="start-title">
          같이 놀고,
          <br />
          내 캐릭터로 남는다
        </h1>
        <div className="start-avatar" aria-hidden>
          🧑‍🚀
        </div>
        <label className="start-label" htmlFor="nickname">
          닉네임
        </label>
        <input
          id="nickname"
          className="start-input"
          placeholder="닉네임을 입력하세요"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={12}
        />
        <p className="start-hint">외형/성별 커스터마이징은 추후 제공됩니다.</p>
      </div>
      <Button onClick={handleNext}>다음</Button>
    </PhoneFrame>
  )
}
