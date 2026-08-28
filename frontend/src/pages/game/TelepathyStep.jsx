import { useCallback, useEffect, useRef, useState } from 'react'
import ProgressBar from '../../components/common/ProgressBar'
import { getPlayers } from '../../api/players'
import { getTelepathyRound, getTelepathyStatus, submitTelepathy } from '../../api/telepathy'

const REVEAL_MS = 3000
const POLL_MS = 1000

// 기획안 §4-3 — 탭 두 번. ①은 내 취향, ②는 나와 같은 걸 고를 것 같은 사람.
export default function TelepathyStep({ code, playerId, onAdvance }) {
  const [roundNo, setRoundNo] = useState(1)
  const [round, setRound] = useState(null)
  const [players, setPlayers] = useState([])
  const [choice, setChoice] = useState(null)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const advanced = useRef(false)

  useEffect(() => {
    getPlayers(code).then(setPlayers).catch((err) => setError(err.message))
  }, [code])

  useEffect(() => {
    advanced.current = false
    setChoice(null)
    setStatus(null)
    getTelepathyRound(code, roundNo).then(setRound).catch((err) => setError(err.message))
  }, [code, roundNo])

  const submitted = status !== null

  const advance = useCallback(() => {
    if (round && roundNo < round.total_rounds) setRoundNo(roundNo + 1)
    else onAdvance()
  }, [round, roundNo, onAdvance])

  useEffect(() => {
    if (!submitted) return
    let cancelled = false
    const poll = () => {
      getTelepathyStatus(code, roundNo)
        .then((s) => {
          if (cancelled) return
          setStatus(s)
          if (s.revealed && !advanced.current) {
            advanced.current = true
            setTimeout(() => {
              if (!cancelled) advance()
            }, REVEAL_MS)
          }
        })
        .catch((err) => !cancelled && setError(err.message))
    }
    const timer = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [submitted, code, roundNo, advance])

  const pick = (targetId) => {
    submitTelepathy(code, roundNo, playerId, choice, targetId)
      .then(setStatus)
      .catch((err) => setError(err.message))
  }

  if (error) return <p className="game-error">{error}</p>
  if (!round) return <p className="game-hint">불러오는 중...</p>

  const others = players.filter((p) => p.id !== playerId)

  if (status?.revealed) {
    const iGuessedRight = status.correct_guessers.includes(
      players.find((p) => p.id === playerId)?.nickname,
    )
    return (
      <div className="tele-results">
        <div className="tele-groups">
          <div className="tele-group a">
            <p className="tele-word">{round.a}</p>
            <p className="tele-names">{status.group_a.join(' · ') || '아무도 없음'}</p>
          </div>
          <div className="tele-group b">
            <p className="tele-word">{round.b}</p>
            <p className="tele-names">{status.group_b.join(' · ') || '아무도 없음'}</p>
          </div>
        </div>
        <p className={`tele-verdict${iGuessedRight ? ' hit' : ''}`}>
          {iGuessedRight ? '통했습니다' : '빗나갔습니다'}
        </p>
        {status.correct_guessers.length > 0 && (
          <p className="tele-hits">맞힌 사람 — {status.correct_guessers.join(' · ')}</p>
        )}
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="game-waiting">
        <p>다른 사람들을 기다리는 중...</p>
        <div className="game-dots">
          {Array.from({ length: status?.total ?? 0 }, (_, i) => (
            <span key={i} className={i < (status?.submitted ?? 0) ? 'game-dot on' : 'game-dot'} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="tele-step">
      <ProgressBar current={roundNo} total={round.total_rounds} />
      {!choice ? (
        <>
          <p className="tele-prompt">나는?</p>
          <div className="answer-choices">
            <button className="answer-choice-btn choice-a" onClick={() => setChoice('A')}>
              {round.a}
            </button>
            <button className="answer-choice-btn choice-b" onClick={() => setChoice('B')}>
              {round.b}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="tele-prompt">
            나랑 <b>{choice === 'A' ? round.a : round.b}</b>를 같이 고를 사람은?
          </p>
          <div className="tele-picks">
            {others.map((p) => (
              <button key={p.id} className="tele-pick" onClick={() => pick(p.id)}>
                {p.nickname}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
