import { useEffect, useState } from 'react'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { getPlayers } from '../../api/players'
import { getAssignStatus, getCards, getSelfStatus, submitAssignment, submitSelfGuess } from '../../api/typeGuess'
import { TYPES } from '../../data/types'

const REVEAL_DISPLAY_MS = 3500
const STATUS_POLL_MS = 1200

export default function TypeGuessStep({ code, playerId, onAdvance }) {
  const [players, setPlayers] = useState([])
  const [selfSubmitted, setSelfSubmitted] = useState(false)
  const [selfStatus, setSelfStatus] = useState(null)
  const [cards, setCards] = useState(null)
  const [assignments, setAssignments] = useState({})
  const [assignSubmitted, setAssignSubmitted] = useState(false)
  const [assignStatus, setAssignStatus] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPlayers(code).then(setPlayers).catch((err) => setError(err.message))
  }, [code])

  // 1단계: 자기 유형 찍기 — 전원 제출될 때까지 폴링
  useEffect(() => {
    if (!selfSubmitted) return
    let cancelled = false
    const poll = () => {
      getSelfStatus(code)
        .then((s) => {
          if (cancelled) return
          setSelfStatus(s)
          if (s.revealed) {
            getCards(code, playerId).then((c) => !cancelled && setCards(c)).catch((err) => !cancelled && setError(err.message))
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
  }, [selfSubmitted, code, playerId])

  // 2단계: 카드 배정 — 전원 제출될 때까지 폴링
  useEffect(() => {
    if (!assignSubmitted) return
    let cancelled = false
    const poll = () => {
      getAssignStatus(code)
        .then((s) => {
          if (cancelled) return
          setAssignStatus(s)
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
  }, [assignSubmitted, code, onAdvance])

  const handleSelfPick = (typeCode) => {
    setSelfSubmitted(true)
    submitSelfGuess(code, playerId, typeCode).catch((err) => setError(err.message))
  }

  const others = players.filter((p) => p.id !== playerId)

  const handleAssignChange = (cardId, targetPlayerId) => {
    setAssignments({ ...assignments, [cardId]: targetPlayerId })
  }

  const usedTargets = new Set(Object.values(assignments).filter(Boolean))
  const allAssigned = cards ? cards.every((c) => assignments[c.card_id]) && usedTargets.size === cards.length : false

  const handleSubmitAssign = () => {
    const payload = cards.map((c) => ({ card_id: c.card_id, target_player_id: assignments[c.card_id] }))
    setAssignSubmitted(true)
    submitAssignment(code, playerId, payload).catch((err) => setError(err.message))
  }

  if (error) return <p className="game-error">{error}</p>

  if (assignSubmitted) {
    if (!assignStatus?.revealed) {
      return (
        <div className="game-waiting">
          <p>다른 사람들을 기다리는 중...</p>
          <span className="game-waiting-count">{assignStatus?.submitted ?? 0}/{assignStatus?.total ?? 5}</span>
        </div>
      )
    }
    const mine = assignStatus.results.filter((r) => r.guesser_nickname)
    return (
      <div className="typeguess-results">
        <p className="typeguess-results-title">배정 결과</p>
        <ul className="typeguess-result-list">
          {mine.map((r, i) => (
            <li key={i} className={r.correct ? 'typeguess-correct' : 'typeguess-wrong'}>
              {r.guesser_nickname}님 → {players.find((p) => p.id === r.target_player_id)?.nickname ?? '?'}
              <span>{r.correct ? '정답' : '오답'}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (cards) {
    return (
      <div className="typeguess-assign">
        <p className="typeguess-hint">누구의 카드일까요? 카드마다 이름을 골라주세요.</p>
        {cards.map((c) => (
          <Card key={c.card_id} className="typeguess-card">
            <div className="typeguess-card-head" style={{ color: c.color }}>
              <span className="typeguess-card-symbol">{c.symbol}</span>
              <div>
                <p className="typeguess-card-name">{c.name}</p>
                <p className="typeguess-card-subtitle">{c.subtitle}</p>
              </div>
            </div>
            <select
              className="typeguess-select"
              value={assignments[c.card_id] ?? ''}
              onChange={(e) => handleAssignChange(c.card_id, e.target.value)}
            >
              <option value="">선택...</option>
              {others.map((p) => (
                <option key={p.id} value={p.id} disabled={usedTargets.has(p.id) && assignments[c.card_id] !== p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
          </Card>
        ))}
        <Button onClick={handleSubmitAssign} disabled={!allAssigned}>
          제출하기
        </Button>
      </div>
    )
  }

  if (selfSubmitted) {
    return (
      <div className="game-waiting">
        <p>전원이 자기 유형을 찍을 때까지 기다리는 중...</p>
        <span className="game-waiting-count">{selfStatus?.submitted ?? 0}/{selfStatus?.total ?? 5}</span>
      </div>
    )
  }

  return (
    <div className="typeguess-self">
      <p className="typeguess-hint">내 유형은 뭘까요? 하나만 골라주세요.</p>
      <div className="typeguess-grid">
        {Object.entries(TYPES).map(([code_, t]) => (
          <button key={code_} className="typeguess-type-btn" style={{ borderColor: t.color }} onClick={() => handleSelfPick(code_)}>
            <span className="typeguess-type-symbol">{t.symbol}</span>
            <span className="typeguess-type-name">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
