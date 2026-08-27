import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import ProgressBar from '../../components/common/ProgressBar'
import { getSurveyItems, getSurveyState, submitSurvey } from '../../api/rooms'
import { useRoomFlow } from '../../context/RoomFlowContext'
import './SurveyPage.css'

const POLL_MS = 2000

export default function SurveyPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { userId } = useRoomFlow()

  const [items, setItems] = useState([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [phase, setPhase] = useState('intro') // intro | asking | waiting
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getSurveyItems(code)
      .then((data) => {
        if (!cancelled) setItems(data.items)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [code])

  const finish = useCallback(
    async (finalAnswers) => {
      setPhase('waiting')
      try {
        await submitSurvey(code, userId, finalAnswers)
      } catch (err) {
        setError(err.message)
      }
    },
    [code, userId],
  )

  // Everyone waits here until the room has finished. Nothing about anyone
  // else's answers is shown before that. Plan doc §10-5.
  useEffect(() => {
    if (phase !== 'waiting') return
    let cancelled = false
    let timer

    const tick = async () => {
      try {
        const next = await getSurveyState(code)
        if (!cancelled) {
          setState(next)
          if (next.revealed) {
            navigate(`/room/${code}/stage/1`)
            return
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS)
    }

    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [phase, code, navigate])

  const handleChoose = (itemId, choiceKey) => {
    const next = { ...answers, [itemId]: choiceKey }
    setAnswers(next)
    // No going back. An answer changed after seeing the next question is a
    // different answer. Plan doc §12.
    if (index + 1 >= items.length) {
      finish(next)
      return
    }
    setIndex(index + 1)
  }

  if (error && phase !== 'waiting') {
    return (
      <PhoneFrame>
        <TopBar title="0단계 · 설문" />
        <p className="survey-error">{error}</p>
        <Button onClick={() => navigate(`/room/${code}/waiting`)}>대기실로</Button>
      </PhoneFrame>
    )
  }

  if (phase === 'intro') {
    return (
      <PhoneFrame>
        <TopBar title="0단계 · 설문" />
        <ProgressBar current={0} total={items.length || 18} label="설문 시작 전" />
        <div className="survey-intro">
          <h1 className="survey-title">
            성향
            <br />
            설문
          </h1>
          <p className="survey-desc">
            정답은 없어요. 제출 전에는 다른 사람의 답이 보이지 않아요. 한 번 고르면 다음으로
            넘어가요.
          </p>
        </div>
        <Button onClick={() => setPhase('asking')} disabled={items.length === 0}>
          {items.length === 0 ? '문항 불러오는 중…' : `설문 시작하기 (${items.length}문항)`}
        </Button>
      </PhoneFrame>
    )
  }

  if (phase === 'waiting') {
    return (
      <PhoneFrame>
        <TopBar title="0단계 · 설문" />
        <ProgressBar current={items.length} total={items.length} label="제출 완료" />
        <div className="survey-intro">
          <h1 className="survey-title">다 왔어요</h1>
          <p className="survey-desc">
            {state
              ? `${state.total}명 중 ${state.submitted}명 제출했어요`
              : '다른 사람들을 기다리는 중이에요'}
          </p>
          {error && <p className="survey-error">{error}</p>}
        </div>
        <div className="survey-spinner" aria-hidden />
      </PhoneFrame>
    )
  }

  const item = items[index]

  return (
    <PhoneFrame>
      <TopBar title="0단계 · 설문" showBack={false} />
      <ProgressBar current={index} total={items.length} label={`${index + 1}/${items.length}`} />

      <div className="survey-q">{item.text}</div>

      <div className="survey-choices">
        {item.choices.map((choice) => (
          <button
            key={choice.key}
            type="button"
            className="survey-choice"
            onClick={() => handleChoose(item.id, choice.key)}
          >
            {choice.text}
          </button>
        ))}
      </div>

      <p className="survey-foot">제출 전에는 다른 사람 답이 안 보입니다</p>
    </PhoneFrame>
  )
}
