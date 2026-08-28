import { useEffect, useRef, useState } from 'react'
import ProgressBar from '../../components/common/ProgressBar'
import { getAnswerStatus, submitAnswer } from '../../api/answers'

const REVEAL_DISPLAY_MS = 2500
const STATUS_POLL_MS = 1000

export default function AnswerStep({ code, playerId, questions, onAdvance }) {
  const [questionNo, setQuestionNo] = useState(1)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [myChoice, setMyChoice] = useState(null)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  // The reveal handler must fire once. Without this the 1s poll schedules a
  // fresh advance timer on every tick after the reveal, and on the last
  // question that means onAdvance runs again every second.
  const advanced = useRef(false)

  const question = questions.find((q) => q.questionNo === questionNo)
  const submitted = myChoice !== null

  useEffect(() => {
    setStartedAt(Date.now())
    setMyChoice(null)
    setStatus(null)
    advanced.current = false
  }, [questionNo])

  useEffect(() => {
    if (!submitted) return
    let cancelled = false
    const poll = () => {
      getAnswerStatus(code, questionNo)
        .then((s) => {
          if (cancelled) return
          setStatus(s)
          if (s.revealed && !advanced.current) {
            advanced.current = true
            setTimeout(() => {
              if (cancelled) return
              if (questionNo < questions.length) setQuestionNo(questionNo + 1)
              else onAdvance()
            }, REVEAL_DISPLAY_MS)
          }
        })
        .catch((err) => !cancelled && setError(err.message))
    }
    poll()
    const timer = setInterval(poll, STATUS_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [submitted, code, questionNo, questions.length, onAdvance])

  const handleChoice = (choice) => {
    const elapsedMs = Date.now() - startedAt
    setMyChoice(choice)
    submitAnswer(code, questionNo, playerId, choice, elapsedMs).catch((err) => setError(err.message))
  }

  if (error) return <p className="game-error">{error}</p>

  if (submitted) {
    if (!status?.revealed) {
      const filled = status?.submitted ?? 0
      const total = status?.total ?? 0
      return (
        <div className="game-waiting">
          <p>다른 사람들을 기다리는 중...</p>
          <div className="game-dots" aria-label={`${filled}/${total}명 제출`}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={i < filled ? 'game-dot on' : 'game-dot'} />
            ))}
          </div>
          <span className="game-waiting-count">
            {filled}/{total}
          </span>
        </div>
      )
    }

    // Plan doc §3-4 — the split shows, nobody is named. Knowing your answer
    // will be attributed changes what you pick, and then the abilities measure
    // the impression rather than the person.
    const { count_a: a, count_b: b } = status
    const total = a + b || 1
    return (
      <div className="answer-results">
        <p className="answer-situation">{question.situation}</p>
        <div className="split">
          <div className="split-side">
            <span className={`split-num${myChoice === 'A' ? ' mine' : ''}`}>{a}</span>
            <p className="split-label">{question.a}</p>
          </div>
          <div className="split-bar">
            <span className="split-fill a" style={{ width: `${(a / total) * 100}%` }} />
            <span className="split-fill b" style={{ width: `${(b / total) * 100}%` }} />
          </div>
          <div className="split-side">
            <span className={`split-num${myChoice === 'B' ? ' mine' : ''}`}>{b}</span>
            <p className="split-label">{question.b}</p>
          </div>
        </div>
        <p className="split-note">
          {a === 0 || b === 0 ? '전원 같은 쪽을 골랐어요' : `${Math.max(a, b)} 대 ${Math.min(a, b)}로 갈렸어요`}
        </p>
      </div>
    )
  }

  return (
    <div className="answer-step">
      <ProgressBar current={questionNo} total={questions.length} />
      <p className="answer-situation">{question.situation}</p>
      <div className="answer-choices">
        <button className="answer-choice-btn choice-a" onClick={() => handleChoice('A')}>
          {question.a}
        </button>
        <button className="answer-choice-btn choice-b" onClick={() => handleChoice('B')}>
          {question.b}
        </button>
      </div>
    </div>
  )
}
