import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import ProgressBar from '../../components/common/ProgressBar'
import { DemoActionRow, DemoNotice, DemoOptionList, DemoPlayerTabs } from '../../components/common/GameDemoControls'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import {
  DEMO_PERSONAS,
  DEMO_PLAYERS,
  FLAVORED_GAME_CONTENT,
  IMPOSTOR_QUESTIONS_PER_ROUND,
} from '../../data/gameDemo/gameDemoData'
import { buildImpostorVotePairs, syncImpostorChoice } from '../../data/gameDemo/gameDemoModels'
import FlavorToggle from '../../components/common/FlavorToggle'
import './PersonaImpostorDemoPage.css'

const PHASES = ['역할 확인', '상황 선택', '의심과 질문', '최종 투표', 'REVEAL']
const IMPOSTOR_ID = 'seojun'
const STOLEN_OWNER_ID = 'yuna'

export default function PersonaImpostorDemoPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('mild')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [roundQuestion, setRoundQuestion] = useState(0)
  const [phase, setPhase] = useState(0)
  const [activeId, setActiveId] = useState('seojun')
  const [revealed, setRevealed] = useState([])
  const [answers, setAnswers] = useState({})
  const [answerHistory, setAnswerHistory] = useState([])
  const [votes, setVotes] = useState({})
  const active = DEMO_PLAYERS.find((player) => player.id === activeId)
  const persona = DEMO_PERSONAS[activeId]
  const questions = FLAVORED_GAME_CONTENT['persona-impostor'][mode]
  const question = questions[questionIndex]
  const allRolesSeen = revealed.length === DEMO_PLAYERS.length
  const allAnswered = Object.keys(answers).length === DEMO_PLAYERS.length
  const allVoted = Object.keys(votes).length === DEMO_PLAYERS.length
  const votePairs = useMemo(() => buildImpostorVotePairs(DEMO_PLAYERS), [])
  const correctVotes = Object.values(votes).filter((vote) => vote === `${IMPOSTOR_ID}:${STOLEN_OWNER_ID}`).length
  const progressLabel = phase === 1
    ? `상황 선택 ${roundQuestion + 1}/${IMPOSTOR_QUESTIONS_PER_ROUND}`
    : PHASES[phase]

  const revealRole = () => {
    setRevealed((current) => current.includes(activeId) ? current : [...current, activeId])
  }

  const chooseAnswer = (option) => {
    if (activeId === IMPOSTOR_ID) return
    setAnswers((current) => activeId === STOLEN_OWNER_ID
      ? syncImpostorChoice({ ...current, [activeId]: option }, STOLEN_OWNER_ID, IMPOSTOR_ID)
      : { ...current, [activeId]: option })
  }

  const resetRoundState = () => {
    setRoundQuestion(0)
    setPhase(0)
    setActiveId('seojun')
    setRevealed([])
    setAnswers({})
    setAnswerHistory([])
    setVotes({})
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setQuestionIndex(0)
    resetRoundState()
  }

  const startNextRound = () => {
    setQuestionIndex((value) => (value + 1) % questions.length)
    resetRoundState()
  }

  const completeQuestion = () => {
    setAnswerHistory((current) => [...current, { question, answers }])

    if (roundQuestion + 1 < IMPOSTOR_QUESTIONS_PER_ROUND) {
      setRoundQuestion((value) => value + 1)
      setQuestionIndex((value) => (value + 1) % questions.length)
      setActiveId('seojun')
      setAnswers({})
      return
    }

    setPhase(2)
  }

  const advancePhase = () => {
    if (phase === 1) {
      completeQuestion()
      return
    }
    setPhase((value) => value + 1)
  }

  return (
    <PhoneFrame>
      <TopBar title="너 누구야? · DEMO" onBack={() => navigate('/games/demo')} />
      <FlavorToggle value={mode} onChange={changeMode} />
      <ProgressBar current={phase + 1} total={PHASES.length} label={progressLabel} />

      <DemoPlayerTabs players={DEMO_PLAYERS} activeId={activeId} onChange={setActiveId} />

      <section className="impostor-public-personas" aria-label="공개 Persona 카드">
        {DEMO_PLAYERS.map((player) => (
          <div key={player.id}>
            <b>{player.name}</b>
            <span>{DEMO_PERSONAS[player.id].title}</span>
            <small>{DEMO_PERSONAS[player.id].traits.join(' · ')}</small>
          </div>
        ))}
      </section>

      {phase === 0 && (
        <Card className="impostor-secret-card">
          {!revealed.includes(activeId) ? (
            <div className="demo-center">
              <span className="demo-big-icon">🔐</span>
              <h1>{active.name}의 비밀 역할</h1>
              <p>다른 사람은 보지 않도록 가리고 확인하세요.</p>
              <Button onClick={revealRole}>역할 확인</Button>
            </div>
          ) : activeId === IMPOSTOR_ID ? (
            <div>
              <Badge tone="positive">PERSONA IMPOSTOR</Badge>
              <h1>유나처럼 행동하세요.</h1>
              <p>유나의 선택은 자동으로 복제됩니다. 선택 이유는 직접 연기해야 합니다.</p>
              <div className="stolen-persona">
                <small>STOLEN PERSONA</small>
                <b>유나 · {DEMO_PERSONAS.yuna.title}</b>
              </div>
            </div>
          ) : (
            <div>
              <Badge tone="neutral">NORMAL</Badge>
              <h1>평소의 나로 답하세요.</h1>
              <p>누군가가 다른 사람의 Persona를 훔쳤습니다.</p>
              <div className="stolen-persona">
                <small>MY PERSONA</small>
                <b>{persona.title}</b>
              </div>
            </div>
          )}
        </Card>
      )}

      {phase === 1 && (
        <Card>
          <Badge tone="fun">3지선다 · {roundQuestion + 1}/{IMPOSTOR_QUESTIONS_PER_ROUND}</Badge>
          <h2 className="demo-question">{question.text}</h2>
          <DemoOptionList
            options={question.options}
            selectedIndex={answers[activeId]}
            disabled={activeId === IMPOSTOR_ID}
            onSelect={chooseAnswer}
          />
          {activeId === IMPOSTOR_ID && (
            <DemoNotice>
              {answers.seojun === undefined
                ? '유나의 선택을 기다리는 중…'
                : `PERSONA SYNC · ${answers.seojun + 1}번 선택 복제 완료`}
            </DemoNotice>
          )}
        </Card>
      )}

      {phase === 2 && (
        <div>
          {answerHistory.map((entry, historyIndex) => (
            <Card key={`${entry.question.text}-${historyIndex}`}>
              <Badge tone="positive">SUSPECT · {historyIndex + 1}</Badge>
              <h2 className="demo-question">{entry.question.text}</h2>
              {entry.question.options.map((option, optionIndex) => (
                <div key={option} className="answer-group">
                  <b>{option}</b>
                  <span>
                    {DEMO_PLAYERS
                      .filter((player) => entry.answers[player.id] === optionIndex)
                      .map((player) => player.name)
                      .join(', ') || '선택 없음'}
                  </span>
                </div>
              ))}
            </Card>
          ))}
          <Card>
            <h2>꼬리 질문</h2>
            <p>왜 그 선택을 했어요?</p>
            <p>평소 Persona와 같은 결정이었어요?</p>
            <p>서로 얼굴을 보고 세 번의 선택 이유를 비교해보세요.</p>
          </Card>
        </div>
      )}

      {phase === 3 && (
        <Card>
          <Badge tone="fun">FINAL VOTE</Badge>
          <h2>{active.name}의 비밀투표</h2>
          <label className="demo-field">
            Impostor와 훔친 Persona를 선택하세요
            <select
              value={votes[activeId] || ''}
              onChange={(event) => setVotes((current) => ({ ...current, [activeId]: event.target.value }))}
            >
              <option value="">선택</option>
              {votePairs.map((pair) => <option key={pair.value} value={pair.value}>{pair.label}</option>)}
            </select>
          </label>
          <DemoNotice>투표 완료 {Object.keys(votes).length} / 4</DemoNotice>
        </Card>
      )}

      {phase === 4 && (
        <Card className="impostor-reveal">
          <span>PERSONA BREACH DETECTED</span>
          <h1>서준은<br />IMPOSTOR</h1>
          <p>훔친 Persona는 <b>유나 · 신중한 플래너</b></p>
          <p><b>{correctVotes} / 4명</b>이 범인과 Persona를 모두 맞혔습니다.</p>
          <p>선택은 훔칠 수 있지만 생각까지 훔칠 수는 없었습니다.</p>
          <DemoActionRow balanced>
            <Button variant="secondary" onClick={resetRoundState}>다시 하기</Button>
            <Button onClick={startNextRound}>새 질문 묶음</Button>
          </DemoActionRow>
        </Card>
      )}

      {phase < 4 && (
        <DemoActionRow>
          <Button variant="secondary" onClick={resetRoundState}>처음부터</Button>
          <Button
            disabled={(phase === 0 && !allRolesSeen) || (phase === 1 && !allAnswered) || (phase === 3 && !allVoted)}
            onClick={advancePhase}
          >
            {phase === 1 && roundQuestion + 1 < IMPOSTOR_QUESTIONS_PER_ROUND ? '다음 질문' : '다음 단계'}
          </Button>
        </DemoActionRow>
      )}
    </PhoneFrame>
  )
}
