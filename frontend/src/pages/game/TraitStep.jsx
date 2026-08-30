import { useEffect, useRef, useState } from 'react'
import Button from '../../components/common/Button'
import { getTraitOptions, getTraitTurn, submitTraitGuess, submitTraitSelf } from '../../api/trait'

const POLL_MS = 1200
const REVEAL_MS = 4000

// 기획안 §4-5 — 전원이 자기 답을 먼저 고르고, 그다음 한 명씩 돌아가며
// 나머지가 그 사람의 답을 맞힌다.
export default function TraitStep({ code, playerId, onHold, onAdvance }) {
  const [options, setOptions] = useState(null)
  const [selfDone, setSelfDone] = useState(false)
  const [myIndex, setMyIndex] = useState(null)
  const [pick, setPick] = useState(null)
  // 방금 끝난 사람의 정답을 몇 초 붙잡아 둔다 — 다음 차례 정보는 이미 와 있다.
  const [holdReveal, setHoldReveal] = useState(null)
  const heldFor = useRef(null)
  const [selfStatus, setSelfStatus] = useState(null)
  const [turn, setTurn] = useState(null)
  const [guessed, setGuessed] = useState(false)
  const [error, setError] = useState(null)
  const advanced = useRef(false)

  useEffect(() => {
    getTraitOptions(code)
      .then((r) => {
        setOptions(r.options)
        setSelfStatus(r)
      })
      .catch((err) => setError(err.message))
  }, [code])

  // 자기 답을 낸 뒤부터는 턴을 따라간다.
  useEffect(() => {
    if (!selfDone) return
    let cancelled = false
    const poll = () => {
      getTraitTurn(code)
        .then((t) => {
          if (cancelled) return
          setTurn((prev) => {
            if (prev?.target_player_id !== t.target_player_id) {
              setGuessed(false)
              setPick(null)
            }
            return t
          })
          if (t.reveal_nickname && heldFor.current !== t.reveal_nickname) {
            heldFor.current = t.reveal_nickname
            setHoldReveal({
              nickname: t.reveal_nickname,
              index: t.reveal_index,
              guessers: t.reveal_correct_guessers ?? [],
            })
            setTimeout(() => {
              if (!cancelled) setHoldReveal(null)
            }, REVEAL_MS)
          }
          if (t.done && !advanced.current) {
            advanced.current = true
            onHold?.()
            setTimeout(() => {
              if (!cancelled) onAdvance()
            }, REVEAL_MS)
          }
        })
        .catch((err) => !cancelled && setError(err.message))
    }
    poll()
    const timer = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [selfDone, code, onHold, onAdvance])

  const chooseSelf = (index) => {
    setMyIndex(index)
    submitTraitSelf(code, playerId, index)
      .then((r) => {
        setSelfStatus(r)
        setSelfDone(true)
      })
      .catch((err) => setError(err.message))
  }

  const guess = () => {
    setGuessed(true)
    submitTraitGuess(code, turn.target_player_id, playerId, pick)
      .then(setTurn)
      .catch((err) => {
        setGuessed(false)
        setError(err.message)
      })
  }

  if (error) return <p className="game-error">{error}</p>
  if (!options) return <p className="game-hint">불러오는 중...</p>

  if (!selfDone) {
    return (
      <div className="trait-step">
        <p className="trait-prompt">
          나는 <b>___</b>한 사람이다
        </p>
        <div className="trait-options">
          {options.map((label, i) => (
            <button
              key={label}
              className={`trait-option${pick === i ? ' picked' : ''}`}
              onClick={() => setPick(i)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="trait-note">남들이 이걸 맞힐 거예요</p>
        <Button disabled={pick === null} onClick={() => chooseSelf(pick)}>
          확인
        </Button>
      </div>
    )
  }

  if (!turn || (!turn.target_player_id && !turn.done)) {
    return (
      <div className="game-waiting">
        <p>다들 고르는 중...</p>
        <div className="game-dots">
          {Array.from({ length: selfStatus?.total ?? 0 }, (_, i) => (
            <span key={i} className={i < (selfStatus?.submitted ?? 0) ? 'game-dot on' : 'game-dot'} />
          ))}
        </div>
      </div>
    )
  }

  const isMyTurn = turn.target_player_id === playerId

  if (holdReveal) {
    return (
      <div className="trait-reveal">
        <p className="trait-target">{holdReveal.nickname}님은</p>
        <p className="trait-answer">{options[holdReveal.index] ?? '???'}</p>
        <p className="trait-hits">
          {holdReveal.guessers.length > 0
            ? `맞힌 사람 — ${holdReveal.guessers.join(' · ')}`
            : '아무도 못 맞혔습니다'}
        </p>
      </div>
    )
  }

  if (turn.revealed) {
    return (
      <div className="trait-reveal">
        <p className="trait-target">{turn.nickname}님은</p>
        <p className="trait-answer">{options[turn.correct_index] ?? '???'}</p>
        <p className="trait-hits">
          {turn.correct_guessers.length > 0
            ? `맞힌 사람 — ${turn.correct_guessers.join(' · ')}`
            : '아무도 못 맞혔습니다'}
        </p>
      </div>
    )
  }

  if (isMyTurn) {
    return (
      <div className="game-waiting">
        <p>
          <b>내 차례</b>예요. 다들 맞히는 중...
        </p>
        {myIndex !== null && (
          <p className="trait-mine">
            내가 고른 답 — <b>{options[myIndex]}</b>
          </p>
        )}
        <div className="game-dots">
          {Array.from({ length: turn.total }, (_, i) => (
            <span key={i} className={i < turn.submitted ? 'game-dot on' : 'game-dot'} />
          ))}
        </div>
      </div>
    )
  }

  if (guessed) {
    return (
      <div className="game-waiting">
        <p>{turn.nickname}님의 답을 기다리는 중...</p>
        <div className="game-dots">
          {Array.from({ length: turn.total }, (_, i) => (
            <span key={i} className={i < turn.submitted ? 'game-dot on' : 'game-dot'} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="trait-step">
      <p className="trait-prompt">
        <b>{turn.nickname}</b>님은 ___한 사람이다
      </p>
      <div className="trait-options">
        {options.map((label, i) => (
          <button
            key={label}
            className={`trait-option${pick === i ? ' picked' : ''}`}
            onClick={() => setPick(i)}
          >
            {label}
          </button>
        ))}
      </div>
      <Button disabled={pick === null} onClick={guess}>
        확인
      </Button>
    </div>
  )
}
