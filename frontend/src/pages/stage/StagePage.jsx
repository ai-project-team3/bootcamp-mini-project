import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import ProgressBar from '../../components/common/ProgressBar'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getStage, getStages } from '../../data/stages'
import './StagePage.css'

export default function StagePage() {
  const { code, n } = useParams()
  const navigate = useNavigate()
  const { category } = useRoomFlow()

  const stages = getStages(category.frame)
  const stage = getStage(category.frame, n)
  const isLast = stage.n >= stages.length

  const handleNext = () => {
    if (isLast) {
      navigate(`/room/${code}/report`)
      return
    }
    navigate(`/room/${code}/stage/${stage.n + 1}`)
  }

  return (
    <PhoneFrame>
      <TopBar title={`${stage.n}단계 · ${stage.title}`} />
      <ProgressBar current={stage.n} total={stages.length} label={stage.duration} />

      <div className="stage-body">
        <h1 className="stage-title">{stage.title}</h1>
        <p className="stage-desc">{stage.desc}</p>
      </div>

      <Button onClick={handleNext}>{isLast ? '리포트 보러 가기' : '다음 단계'}</Button>
    </PhoneFrame>
  )
}
