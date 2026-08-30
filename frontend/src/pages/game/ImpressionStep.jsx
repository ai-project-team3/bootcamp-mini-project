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

  const isLast = questionIndex >= questions.length - 1

  // 마지막 문항 전까지는 지금처럼 탭 한 번으로 넘어간다 — 다섯 문항에 확인
  // 버튼을 붙이면 탭이 두 배가 된다. 대신 위로 되돌아갈 수 있게 두고, 제출만
  // 명시적인 버튼으로 받는다.
  const handlePick = (targetId) => {
    setPicks({ ...picks, [question.questionNo]: targetId })
    if (!isLast) setQuestionIndex(questionIndex + 1)
  }

  const handleSubmit = () => {
    const votes = questions.map((q) => ({ question_no: q.questionNo, target_player_id: picks[q.questionNo] }))
    setSubmitted(true)
    submitImpression(code, round, playerId, votes).catch((err) => setError(err.message))
  }

  if (error) return <p className="game-error">{error}</p>

  if (submitted) {
    if (!status?.revealed) {
      return (
        <div className="game-waiting">
          <p>다른 사람들을 기다리는 중...</p>
          <span className="game-waiting-count">{status?.submitted ?? 0}/{status?.total ?? players.length}</span>
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
      <div className="impression-top">
        <button
          className="impression-back"
          onClick={() => setQuestionIndex(questionIndex - 1)}
          disabled={questionIndex === 0}
        >
          ← 이전
        </button>
        <ProgressBar current={questionIndex + 1} total={questions.length} />
      </div>
      {round === 'post' && questionIndex === 0 && (
        <p className="impression-note">
          게임을 하고 나서 생각이 바뀌었는지 봅니다. 처음과 같아도 괜찮습니다
        </p>
      )}
      <div className="step-body">
        <h2 className="impression-question">{question.text}</h2>
        <div className="impression-choices">
          {others.map((p) => (
            <Button
              key={p.id}
              variant="secondary"
              className={picks[question.questionNo] === p.id ? 'is-picked' : ''}
              onClick={() => handlePick(p.id)}
            >
              {p.nickname}
            </Button>
          ))}
        </div>
      </div>
      {isLast && (
        <Button disabled={!picks[question.questionNo]} onClick={handleSubmit}>
          제출하기
        </Button>
      )}
    </div>
  )
}
