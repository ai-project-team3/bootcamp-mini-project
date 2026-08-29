import { useEffect, useState } from 'react'
import ProgressBar from '../../components/common/ProgressBar'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { getPlayers } from '../../api/players'
import { getImpressionStatus, submitImpression } from '../../api/impressions'

const REVEAL_DISPLAY_MS = 3000
const STATUS_POLL_MS = 1200

export default function ImpressionStep({ code, playerId, round, questions, onAdvance }) {
  const [players, setPlayers] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [picks, setPicks] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPlayers(code).then(setPlayers).catch((err) => setError(err.message))
  }, [code])

  useEffect(() => {
    if (!submitted) return
    let cancelled = false
    const poll = () => {
      getImpressionStatus(code, round)
        .then((s) => {
          if (cancelled) return
          setStatus(s)
          if (s.revealed) {
            setTimeout(() => {
              if (!cancelled) onAdvance()
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
  }, [submitted, code, round, onAdvance])

  const question = questions[questionIndex]
  const others = players.filter((p) => p.id !== playerId)

  const handlePick = (targetId) => {
    const next = { ...picks, [question.questionNo]: targetId }
    setPicks(next)
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(questionIndex + 1)
      return
    }
    const votes = questions.map((q) => ({ question_no: q.questionNo, target_player_id: next[q.questionNo] }))
    setSubmitted(true)
    submitImpression(code, round, playerId, votes).catch((err) => setError(err.message))
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
      <div className="impression-results">
        {status.results.map((r) => (
          <Card key={r.question_no} className="impression-result-card">
            <p className="impression-result-q">
              {questions.find((q) => q.questionNo === r.question_no)?.text}
            </p>
            <ul className="impression-tally">
              {r.tally.map((t) => (
                <li key={t.player_id}>
                  <span>{t.nickname}</span>
                  <span className="impression-tally-votes">{t.votes}표</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="impression-step">
      <ProgressBar current={questionIndex + 1} total={questions.length} />
      <div className="step-body">
        <h2 className="impression-question">{question.text}</h2>
        <div className="impression-choices">
          {others.map((p) => (
            <Button key={p.id} variant="secondary" onClick={() => handlePick(p.id)}>
              {p.nickname}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
