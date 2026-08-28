import { useEffect, useState } from 'react'
import ProgressBar from '../../components/common/ProgressBar'
import { getAnswerStatus, submitAnswer } from '../../api/answers'
import { EITHER_OR_QUESTIONS } from '../../data/eitherOrQuestions'

const REVEAL_DISPLAY_MS = 2500
const STATUS_POLL_MS = 1000

export default function AnswerStep({ code, playerId, onAdvance }) {
  const [questionNo, setQuestionNo] = useState(1)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  const question = EITHER_OR_QUESTIONS.find((q) => q.questionNo === questionNo)

  useEffect(() => {
    setStartedAt(Date.now())
    setSubmitted(false)
    setStatus(null)
  }, [questionNo])

  useEffect(() => {
    if (!submitted) return
    let cancelled = false
    const poll = () => {
      getAnswerStatus(code, questionNo)
        .then((s) => {
          if (cancelled) return
          setStatus(s)
          if (s.revealed) {
            setTimeout(() => {
              if (cancelled) return
              if (questionNo < EITHER_OR_QUESTIONS.length) {
                setQuestionNo(questionNo + 1)
              } else {
                onAdvance()
              }
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
  }, [submitted, code, questionNo, onAdvance])

  const handleChoice = (choice) => {
    const elapsedMs = Date.now() - startedAt
    setSubmitted(true)
    submitAnswer(code, questionNo, playerId, choice, elapsedMs).catch((err) => setError(err.message))
  }

  if (error) return <p className="game-error">{error}</p>

  if (submitted) {
    if (!status?.revealed) {
      return (
        <div className="game-waiting">
          <p>다른 사람들을 기다리는 중...</p>
          <span className="game-waiting-count">{status?.submitted ?? 0}/{status?.total ?? 5}</span>
        </div>
      )
    }
    return (
      <div className="answer-results">
        <p className="answer-situation">{question.situation}</p>
        <ul className="answer-tally">
          {status.results.map((r) => (
            <li key={r.player_id} className={`answer-tally-${r.choice.toLowerCase()}`}>
              <span>{r.nickname}</span>
              <span className="answer-tally-choice">{r.choice === 'A' ? question.a : question.b}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="answer-step">
      <ProgressBar current={questionNo} total={EITHER_OR_QUESTIONS.length} />
      <p className="answer-situation">{question.situation}</p>
      <div className="answer-choices">
        <button className="answer-choice-btn" onClick={() => handleChoice('A')}>
          {question.a}
        </button>
        <button className="answer-choice-btn" onClick={() => handleChoice('B')}>
          {question.b}
        </button>
      </div>
    </div>
  )
}
