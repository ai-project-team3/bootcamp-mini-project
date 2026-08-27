import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import ProgressBar from '../../components/common/ProgressBar'
import { getRoom } from '../../api/rooms'
import { getStage, getStages } from '../../data/stages'
import './StagePage.css'

export default function StagePage() {
  const { code, n } = useParams()
  const navigate = useNavigate()
  const [frame, setFrame] = useState(null)

  // Read the frame off the room rather than context: after a refresh context is
  // back at its default and a MANY room would render the PAIR stage list.
  useEffect(() => {
    let cancelled = false
    getRoom(code)
      .then((room) => {
        if (!cancelled) setFrame(room.frame)
      })
      .catch(() => {
        if (!cancelled) setFrame('MANY')
      })
    return () => {
      cancelled = true
    }
  }, [code])

  if (!frame) {
    return (
      <PhoneFrame>
        <TopBar title={`${n}단계`} />
        <div className="stage-body">
          <p className="stage-desc">불러오는 중…</p>
        </div>
      </PhoneFrame>
    )
  }

  const stages = getStages(frame)
  const stage = getStage(frame, n)
  const isLast = stage.n >= stages.length

  const handleNext = () => {
    navigate(isLast ? `/room/${code}/report` : `/room/${code}/stage/${stage.n + 1}`)
  }

  return (
    <PhoneFrame>
      <TopBar title={`${stage.n}단계 · ${stage.title}`} showBack={false} />
      <ProgressBar current={stage.n} total={stages.length} label={stage.duration} />

      <div className="stage-body">
        <h1 className="stage-title">{stage.title}</h1>
        <p className="stage-desc">{stage.desc}</p>
        {/* Still a placeholder. The real stage needs the shared Stage interface
            from plan doc §10-1, which is the next chunk of work. */}
        <p className="stage-todo">게임 로직 미구현 · 기획안 §10</p>
      </div>

      <Button onClick={handleNext}>{isLast ? '리포트 보러 가기' : '다음 단계'}</Button>
    </PhoneFrame>
  )
}
