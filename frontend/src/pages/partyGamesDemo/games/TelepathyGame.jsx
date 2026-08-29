import { useState } from 'react'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import FlavorToggle from '../../../components/common/FlavorToggle'
import { DemoNotice } from '../../../components/common/GameDemoControls'
import { FLAVORED_GAME_CONTENT } from '../../../data/gameDemo/gameDemoData'
import { groupMatchingAnswers } from '../../../data/gameDemo/gameDemoModels'
import { useGameRoom } from '../../../context/GameRoomContext'
import { getPrivateDemoPlayerId } from '../../../data/gameDemo/gameDemoModels'

export default function TelepathyGame({ players }) {
  const { playerId } = useGameRoom()
  const [mode, setMode] = useState('mild')
  const [questionIndex, setQuestionIndex] = useState(0)
  const activeId = getPrivateDemoPlayerId(players, playerId)
  const [answers, setAnswers] = useState({})
  const [draft, setDraft] = useState('')
  const [revealed, setRevealed] = useState(false)
  const questions = FLAVORED_GAME_CONTENT.telepathy[mode]
  const locked = Object.keys(answers).length === players.length
  const groups = groupMatchingAnswers(answers)
  const active = players.find((player) => player.id === activeId)

  const resetAnswers = () => {
    setAnswers({})
    setDraft('')
    setRevealed(false)
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setQuestionIndex(0)
    resetAnswers()
  }

  const lock = () => {
    if (!draft.trim()) return
    setAnswers((current) => ({ ...current, [activeId]: draft.trim() }))
    setDraft('')
  }

  const next = () => {
    setQuestionIndex((value) => (value + 1) % questions.length)
    resetAnswers()
  }

  return (
    <div className="party-play">
      <FlavorToggle value={mode} onChange={changeMode} />
      <Card className="party-category">
        <small>이번 질문</small>
        <h2>{questions[questionIndex]}</h2>
      </Card>

      {!revealed ? (
        <Card>
          <h3>{active.name}의 비공개 답</h3>
          {answers[activeId] ? (
            <div className="party-cover">🔒 LOCKED · 답변 저장 완료</div>
          ) : (
            <label className="party-input">
              답 입력
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="다른 사람에게 보이지 않아요" />
            </label>
          )}
          <Button disabled={Boolean(answers[activeId])} onClick={lock}>🔒 LOCK</Button>
          <DemoNotice>{Object.keys(answers).length} / {players.length}명 LOCK</DemoNotice>
          <Button variant="secondary" disabled={!locked} onClick={() => setRevealed(true)}>모든 답 REVEAL</Button>
        </Card>
      ) : (
        <Card className="party-reveal">
          <span>우리 통했나?</span>
          {groups.map((group) => (
            <div className="telepathy-group" key={group.answer}>
              <h2>{group.answer}</h2>
              <p>{group.players.map((id) => players.find((player) => player.id === id).name).join(' · ')} · {group.players.length}명</p>
            </div>
          ))}
          <p>결과를 본 뒤 휴대폰을 내려놓고 자유롭게 이야기해 보세요.</p>
          <Button onClick={next}>다음 질문</Button>
        </Card>
      )}
    </div>
  )
}
