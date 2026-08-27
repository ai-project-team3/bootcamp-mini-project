import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import ProgressBar from '../../components/common/ProgressBar'
import { useRoomFlow } from '../../context/RoomFlowContext'
import './SurveyPage.css'

export default function SurveyPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { category } = useRoomFlow()

  const handleStart = () => {
    navigate(`/room/${code}/stage/1`)
  }

  return (
    <PhoneFrame>
      <TopBar title="0단계 · 설문" />
      <ProgressBar current={0} total={9} label="설문 시작 전" />

      <div className="survey-intro">
        <h1 className="survey-title">
          {category.label} 성향
          <br />
          설문
        </h1>
        <p className="survey-desc">
          두 선택지 중 하나만 고르면 돼요. 정답은 없어요. 제출 전에는 다른 사람의 답이 보이지
          않아요.
        </p>
      </div>

      <Button onClick={handleStart}>설문 시작하기</Button>
    </PhoneFrame>
  )
}
