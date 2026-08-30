import { useEffect, useState } from 'react'
import ProgressBar from '../../components/common/ProgressBar'
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
    // 집계표는 여기서 보여주지 않는다. 3초 스쳐가는 표는 읽히지도 않고,
    // 무엇보다 이 결과를 지금 알면 뒤 게임에서 그 인상에 맞춰 움직이게 된다.
    // 전후 비교는 리포트에서 한 번에 푼다.
    return (
      <div className="game-waiting">
        <p>{status?.revealed ? '다 모였습니다' : '다른 사람들을 기다리는 중...'}</p>
        <span className="game-waiting-count">
          {status?.submitted ?? 0}/{status?.total ?? players.length}
        </span>
        <p className="game-waiting-note">누가 누구를 골랐는지는 리포트에서 확인합니다</p>
      </div>
    )
  }

  return (
    <div className="impression-step">
      <ProgressBar current={questionIndex + 1} total={questions.length} />
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
      {/* 되돌아가기는 진행바 옆이 아니라 선택지 아래에 둔다. 진행 표시와
          조작 버튼이 한 줄에 섞이면 둘 다 무엇인지 알아보기 어렵다. */}
      <div className="impression-foot">
        <button
          className="impression-back"
          onClick={() => setQuestionIndex(questionIndex - 1)}
          disabled={questionIndex === 0}
        >
          ← 이전 문항
        </button>
        {isLast && (
          <Button disabled={!picks[question.questionNo]} onClick={handleSubmit}>
            제출하기
          </Button>
        )}
      </div>
    </div>
  )
}
