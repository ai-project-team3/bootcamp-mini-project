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
      <TopBar showBack={false} />
      <div className="start-body">
        <div className="start-hero">
          <span className="start-hero-glow" aria-hidden />
          <span className="start-hero-flake start-hero-flake-1" aria-hidden>
            ❄
          </span>
          <span className="start-hero-flake start-hero-flake-2" aria-hidden>
            ❄
          </span>
          <span className="start-hero-flake start-hero-flake-3" aria-hidden>
            ❄
          </span>
          <h1 className="start-title">얼음땡</h1>
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
      </div>
      <Button onClick={handleNext}>다음</Button>
    </PhoneFrame>
  )
}
