import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getStatementsProgress, getTurn, submitLieGuess, submitStatements } from '../../api/statements'
import './StatementsPage.css'

const MAX_LEN = 60
const TURN_POLL_MS = 1200
const REVEAL_DISPLAY_MS = 3000

export default function StatementsPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { playerId } = useRoomFlow()

  const [texts, setTexts] = useState(['', '', ''])
  const [lieSlot, setLieSlot] = useState(1)
  const [myInputSubmitted, setMyInputSubmitted] = useState(false)
  const [progress, setProgress] = useState(null)
  const [turn, setTurn] = useState(null)
  const [guessedForTarget, setGuessedForTarget] = useState(null)
  const [reveal, setReveal] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmitInput = () => {
    if (texts.some((t) => !t.trim())) {
      setError('세 줄을 모두 입력해주세요')
      return
    }
    setError(null)
    const statements = texts.map((text, i) => ({ slot: i + 1, text: text.trim(), is_lie: i + 1 === lieSlot }))
    submitStatements(code, playerId, statements)
      .then(() => setMyInputSubmitted(true))
      .catch((err) => setError(err.message))
  }

  // 전원 입력 완료 대기
  useEffect(() => {
    if (!myInputSubmitted) return
    let cancelled = false
    const poll = () => {
      getStatementsProgress(code)
        .then((p) => !cancelled && setProgress(p))
        .catch((err) => !cancelled && setError(err.message))
    }
    poll()
    const timer = setInterval(poll, TURN_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [myInputSubmitted, code])

  const allInputDone = progress && progress.submitted >= progress.total

  // 턴 순회
  useEffect(() => {
    if (!allInputDone || reveal) return
    let cancelled = false
    const poll = () => {
      getTurn(code)
        .then((t) => {
          if (cancelled) return
          setTurn(t)
          if (t.done) {
            setTimeout(() => !cancelled && navigate(`/room/${code}/game`), REVEAL_DISPLAY_MS)
          }
        })
        .catch((err) => !cancelled && setError(err.message))
    }
    poll()
    const timer = setInterval(poll, TURN_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [allInputDone, reveal, code, navigate])

  const handleGuess = (slot) => {
    submitLieGuess(code, turn.target_player_id, playerId, slot)
      .then((res) => {
        setGuessedForTarget(turn.target_player_id)
        if (res.revealed) {
          setReveal(res)
          setTimeout(() => setReveal(null), REVEAL_DISPLAY_MS)
        }
      })
      .catch((err) => setError(err.message))
  }

  if (error) {
    return (
      <PhoneFrame>
        <TopBar title="둘은 진실, 하나는 거짓" showBack={false} />
        <p className="stmt-error">{error}</p>
      </PhoneFrame>
    )
  }

  if (!myInputSubmitted) {
    return (
      <PhoneFrame>
        <TopBar title="둘은 진실, 하나는 거짓" showBack={false} />
        <p className="stmt-hint">내 이야기 세 줄을 적어주세요. 그중 하나는 거짓이에요.</p>
        <div className="stmt-inputs">
          {texts.map((t, i) => (
            <div key={i} className="stmt-input-row">
              <label className="stmt-radio">
                <input type="radio" name="lie" checked={lieSlot === i + 1} onChange={() => setLieSlot(i + 1)} />
                거짓
              </label>
              <input
                className="stmt-input"
                value={t}
                maxLength={MAX_LEN}
                placeholder={`${i + 1}번째 이야기`}
                onChange={(e) => {
                  const next = [...texts]
                  next[i] = e.target.value
                  setTexts(next)
                }}
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSubmitInput}>제출하기</Button>
      </PhoneFrame>
    )
  }

  if (!allInputDone) {
    return (
      <PhoneFrame>
        <TopBar title="둘은 진실, 하나는 거짓" showBack={false} />
        <div className="game-waiting">
          <p>다른 사람들이 입력을 마칠 때까지 기다리는 중...</p>
          <span className="game-waiting-count">{progress?.submitted ?? 0}/{progress?.total ?? 5}</span>
        </div>
      </PhoneFrame>
    )
  }

  if (reveal) {
    return (
      <PhoneFrame>
        <TopBar title="정답 공개" showBack={false} />
        <div className="stmt-reveal">
          {reveal.statements.map((s) => (
            <p key={s.slot} className={s.slot === reveal.correct_slot ? 'stmt-reveal-lie' : ''}>
              {s.slot}. {s.text} {s.slot === reveal.correct_slot ? '(거짓)' : ''}
            </p>
          ))}
          <ul className="stmt-reveal-guesses">
            {reveal.guesses.map((g, i) => (
              <li key={i}>
                {g.guesser_nickname} → {g.guessed_slot}번 {g.guessed_slot === reveal.correct_slot ? '(정답)' : ''}
              </li>
            ))}
          </ul>
        </div>
      </PhoneFrame>
    )
  }

  if (!turn || turn.done) {
    return (
      <PhoneFrame>
        <TopBar title="둘은 진실, 하나는 거짓" showBack={false} />
        <div className="game-waiting">
          <p>모든 턴이 끝났어요! 다음으로 이동해요...</p>
        </div>
      </PhoneFrame>
    )
  }

  if (turn.target_player_id === playerId) {
    return (
      <PhoneFrame>
        <TopBar title="내 차례" showBack={false} />
        <div className="game-waiting">
          <p>다들 내 거짓말을 찾는 중...</p>
          <span className="game-waiting-count">{turn.submitted}/{turn.total}</span>
        </div>
      </PhoneFrame>
    )
  }

  const alreadyGuessed = guessedForTarget === turn.target_player_id

  return (
    <PhoneFrame>
      <TopBar title={`${turn.nickname}님의 이야기`} showBack={false} />
      <div className="stmt-turn">
        {turn.statements.map((s) => (
          <Card key={s.slot} className="stmt-turn-card">
            {alreadyGuessed ? (
              <p>{s.text}</p>
            ) : (
              <button className="stmt-turn-btn" onClick={() => handleGuess(s.slot)}>
                {s.text}
              </button>
            )}
          </Card>
        ))}
        {alreadyGuessed && (
          <div className="game-waiting">
            <p>다른 사람들을 기다리는 중...</p>
            <span className="game-waiting-count">{turn.submitted}/{turn.total}</span>
          </div>
        )}
      </div>
    </PhoneFrame>
  )
}
