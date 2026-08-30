import { useEffect, useRef, useState } from 'react'
import Button from '../../components/common/Button'
import TypeMark from '../../components/common/TypeMark'
import Card from '../../components/common/Card'
import { getPlayers } from '../../api/players'
import { getAssignStatus, getCards, submitAssignment } from '../../api/typeGuess'
import { TYPES } from '../../data/types'

// 마지막 화면이라 여유를 준다. 버튼으로 먼저 넘어갈 수도 있다.
const REVEAL_DISPLAY_MS = 8000
const STATUS_POLL_MS = 1200

export default function TypeGuessStep({ code, playerId, onAdvance }) {
  const [players, setPlayers] = useState([])
  const [cards, setCards] = useState(null)
  const [assignments, setAssignments] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const advanced = useRef(false)

  useEffect(() => {
    getPlayers(code).then(setPlayers).catch((err) => setError(err.message))
    getCards(code, playerId).then(setCards).catch((err) => setError(err.message))
  }, [code, playerId])

  // 붙자마자 폴링한다. 새로고침으로 다시 들어온 사람이 이미 공개된 판에서
  // 배정 화면을 또 보지 않게 하려면 제출 여부와 무관하게 상태를 봐야 한다.
  useEffect(() => {
    let cancelled = false
    const poll = () => {
      getAssignStatus(code, playerId)
        .then((s) => !cancelled && setStatus(s))
        .catch((err) => !cancelled && setError(err.message))
    }
    poll()
    const timer = setInterval(poll, STATUS_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [code, playerId])

  const revealed = status?.revealed === true

  useEffect(() => {
    if (!revealed || advanced.current) return
    const timer = setTimeout(() => {
      advanced.current = true
      onAdvance()
    }, REVEAL_DISPLAY_MS)
    return () => clearTimeout(timer)
  }, [revealed, onAdvance])

  const handleAssignChange = (cardId, targetPlayerId) => {
    setAssignments({ ...assignments, [cardId]: targetPlayerId })
  }

  const usedTargets = new Set(Object.values(assignments).filter(Boolean))
  const allAssigned = cards ? cards.every((c) => assignments[c.card_id]) && usedTargets.size === cards.length : false

  const handleSubmit = () => {
    const payload = cards.map((c) => ({ card_id: c.card_id, target_player_id: assignments[c.card_id] }))
    setSubmitted(true)
    submitAssignment(code, playerId, payload)
      .then(setStatus)
      .catch((err) => setError(err.message))
  }

  const handleLeave = () => {
    if (advanced.current) return
    advanced.current = true
    onAdvance()
  }

  if (error) return <p className="game-error">{error}</p>

  if (revealed) {
    const mine = TYPES[status.self_type_code]
    const guessed = TYPES[status.self_guess_type_code]
    const correct = status.self_type_code === status.self_guess_type_code
    return (
      <div className="typeguess-reveal">
        <p className="typeguess-reveal-label">당신의 카드는</p>
        <div className="typeguess-reveal-card" style={{ color: mine?.color }}>
          <TypeMark type={mine} size={132} />
          <p className="typeguess-reveal-name">{mine?.name ?? '?'}</p>
          <p className="typeguess-reveal-subtitle">{mine?.subtitle ?? ''}</p>
        </div>

        {guessed && (
          <p className={`typeguess-selfline ${correct ? 'is-correct' : ''}`}>
            {correct
              ? '본인 카드를 정확히 집었습니다.'
              : `본인은 '${guessed.name}' 쪽에 손을 올렸습니다.`}
          </p>
        )}

        {status.results.length > 0 && (
          <>
            <p className="typeguess-reveal-label">나를 맞힌 사람</p>
            <ul className="typeguess-result-list">
              {status.results.map((r, i) => (
                <li key={i} className={r.correct ? 'typeguess-correct' : 'typeguess-wrong'}>
                  {r.guesser_nickname}
                  <span>{r.correct ? '맞힘' : '못 맞힘'}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {status.my_tries > 0 && (
          <p className="typeguess-score">
            나는 {status.my_tries}명 중 <strong>{status.my_hits}명</strong>을 맞혔습니다
          </p>
        )}

        <Button onClick={handleLeave}>리포트 보기</Button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="game-waiting">
        <p>다른 사람들을 기다리는 중...</p>
        <span className="game-waiting-count">{status?.submitted ?? 0}/{status?.total ?? 0}</span>
      </div>
    )
  }

  if (!cards) return <p className="game-waiting">카드를 뽑는 중...</p>

  return (
    <div className="typeguess-assign">
      <p className="typeguess-hint">
        카드 {cards.length}장이 나왔습니다. <strong>한 장은 당신 것</strong>입니다.
        카드마다 주인을 골라주세요.
      </p>
      {cards.map((c) => (
        <Card key={c.card_id} className="typeguess-card">
          <div className="typeguess-card-head">
            <TypeMark type={c} size={88} className="typeguess-card-art" />
            <div>
              <p className="typeguess-card-name" style={{ color: c.color }}>{c.name}</p>
              <p className="typeguess-card-subtitle">{c.subtitle}</p>
            </div>
          </div>
          <select
            className="typeguess-select"
            value={assignments[c.card_id] ?? ''}
            onChange={(e) => handleAssignChange(c.card_id, e.target.value)}
          >
            <option value="">선택...</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={usedTargets.has(p.id) && assignments[c.card_id] !== p.id}>
                {p.id === playerId ? `나 (${p.nickname})` : p.nickname}
              </option>
            ))}
          </select>
        </Card>
      ))}
      <Button onClick={handleSubmit} disabled={!allAssigned}>
        제출하기
      </Button>
    </div>
  )
}
