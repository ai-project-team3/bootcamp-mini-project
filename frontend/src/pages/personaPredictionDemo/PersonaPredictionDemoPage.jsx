import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import FlavorToggle from '../../components/common/FlavorToggle'
import { DemoActionRow, DemoNotice, DemoOptionList, DemoPlayerTabs } from '../../components/common/GameDemoControls'
import ProgressBar from '../../components/common/ProgressBar'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { DEMO_PERSONAS, DEMO_PLAYERS, FLAVORED_GAME_CONTENT } from '../../data/gameDemo/gameDemoData'
import { allPlayersLocked, isPlayerAnswerLocked } from '../../data/gameDemo/gameDemoModels'
import './PersonaPredictionDemoPage.css'

const PHASES = ['비공개 선택', 'ALL ANSWERS LOCKED', '예측 공개', '실제 답 REVEAL', '대화']

export default function PersonaPredictionDemoPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('mild')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [phase, setPhase] = useState(0)
  const [activeId, setActiveId] = useState('seojun')
  const [answers, setAnswers] = useState({})
  const questions = FLAVORED_GAME_CONTENT['persona-prediction'][mode]
  const question = questions[questionIndex]
  const host = DEMO_PLAYERS.find((player) => player.id === question.hostId)
  const active = DEMO_PLAYERS.find((player) => player.id === activeId)
  const locked = allPlayersLocked(answers, DEMO_PLAYERS.length)
  const activeAnswerLocked = isPlayerAnswerLocked(answers, activeId)

  const resetRound = () => {
    setPhase(0)
    setActiveId('seojun')
    setAnswers({})
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setQuestionIndex(0)
    resetRound()
  }

  const nextQuestion = () => {
    setQuestionIndex((value) => (value + 1) % questions.length)
    resetRound()
  }

  return (
    <PhoneFrame>
      <TopBar title="너라면? · DEMO" onBack={() => navigate('/games/demo')} />
      <FlavorToggle value={mode} onChange={changeMode} />
      <ProgressBar current={phase + 1} total={PHASES.length} label={PHASES[phase]} />
      <DemoPlayerTabs players={DEMO_PLAYERS} activeId={activeId} onChange={setActiveId} />

      <Card className="prediction-persona">
        <Badge tone="positive">HOT SEAT · {host.name}</Badge>
        <h2>{DEMO_PERSONAS[host.id].title}</h2>
        <p>{DEMO_PERSONAS[host.id].traits.join(' · ')}</p>
      </Card>

      {phase === 0 && (
        <Card>
          <p className="prediction-role">{active.id === host.id ? '실제 나라면?' : `${host.name}이라면?`}</p>
          <h2 className="prediction-question">{question.text}</h2>
          {activeAnswerLocked ? (
            <div className="prediction-private-cover">🔒 LOCKED · 선택 저장 완료</div>
          ) : (
            <DemoOptionList
              options={question.options}
              onSelect={(index) => setAnswers((current) => ({ ...current, [activeId]: index }))}
            />
          )}
          <DemoNotice>{Object.keys(answers).length} / 4명 선택 완료 · 다른 답은 보이지 않아요</DemoNotice>
        </Card>
      )}

      {phase === 1 && (
        <Card className="prediction-lock">
          <span>🔒</span>
          <h1>ALL ANSWERS<br />LOCKED</h1>
          <p>전원의 선택이 저장됐습니다.</p>
        </Card>
      )}

      {phase === 2 && (
        <Card>
          <Badge tone="fun">PREDICTIONS</Badge>
          <h2>사람들은 {host.name}을 이렇게 예상했어요.</h2>
          {DEMO_PLAYERS.filter((player) => player.id !== host.id).map((player) => (
            <div className="prediction-answer" key={player.id}>
              <b>{player.name}</b>
              <span>{question.options[answers[player.id]]}</span>
            </div>
          ))}
          <DemoNotice>주인공의 실제 답은 아직 비공개입니다.</DemoNotice>
        </Card>
      )}

      {phase === 3 && (
        <Card className="prediction-actual">
          <Badge tone="positive">ACTUAL REVEAL</Badge>
          <h2>{host.name}의 실제 선택</h2>
          <p>{question.options[answers[host.id]]}</p>
        </Card>
      )}

      {phase === 4 && (
        <Card>
          <h2>“네가 그걸 고른다고?”</h2>
          <p>예상과 실제 모습이 달랐던 이유를 휴대폰을 내려놓고 이야기해 보세요.</p>
          <DemoActionRow balanced>
            <Button variant="secondary" onClick={resetRound}>같은 질문</Button>
            <Button onClick={nextQuestion}>다음 질문</Button>
          </DemoActionRow>
        </Card>
      )}

      {phase < 4 && (
        <DemoActionRow>
          <Button variant="ghost" onClick={nextQuestion}>PASS · 다음 질문</Button>
          <Button disabled={phase === 0 && !locked} onClick={() => setPhase((value) => value + 1)}>다음 단계</Button>
        </DemoActionRow>
      )}
    </PhoneFrame>
  )
}
