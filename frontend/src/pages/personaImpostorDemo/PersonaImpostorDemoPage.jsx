import { useMemo, useState } from 'react'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import ProgressBar from '../../components/common/ProgressBar'
import { DemoActionRow, DemoNotice, DemoOptionList } from '../../components/common/GameDemoControls'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import BackToRoomGamesControl from '../../components/common/BackToRoomGamesControl'
import { useGameDemo } from '../../context/GameDemoContext'
import { useRoomFlow } from '../../context/RoomFlowContext'
import {
  FLAVORED_GAME_CONTENT,
  IMPOSTOR_QUESTIONS_PER_ROUND,
} from '../../data/gameDemo/gameDemoData'
import { buildImpostorVotePairs, getPrivateDemoPlayerId, syncImpostorChoice } from '../../data/gameDemo/gameDemoModels'
import FlavorToggle from '../../components/common/FlavorToggle'
import './PersonaImpostorDemoPage.css'

const PHASES = ['역할 확인', '상황 선택', '의심과 질문', '최종 투표', 'REVEAL']
export default function PersonaImpostorDemoPage() {
  const { players, personas } = useGameDemo()
  const { playerId } = useRoomFlow()
  const impostorId = players[0].id
  const stolenOwnerId = players[1].id
  const [mode, setMode] = useState('mild')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [roundQuestion, setRoundQuestion] = useState(0)
  const [phase, setPhase] = useState(0)
  const activeId = getPrivateDemoPlayerId(players, playerId)
  const [revealed, setRevealed] = useState([])
  const [answers, setAnswers] = useState({})
  const [answerHistory, setAnswerHistory] = useState([])
  const [votes, setVotes] = useState({})
  const active = players.find((player) => player.id === activeId)
  const persona = personas[activeId]
  const questions = FLAVORED_GAME_CONTENT['persona-impostor'][mode]
  const question = questions[questionIndex]
  const allRolesSeen = revealed.includes(activeId)
  const allAnswered = activeId === impostorId || answers[activeId] !== undefined
  const allVoted = votes[activeId] !== undefined
  const votePairs = useMemo(() => buildImpostorVotePairs(players), [players])
  const correctVotes = Object.values(votes).filter((vote) => vote === `${impostorId}:${stolenOwnerId}`).length
  const progressLabel = phase === 1
    ? `상황 선택 ${roundQuestion + 1}/${IMPOSTOR_QUESTIONS_PER_ROUND}`
    : PHASES[phase]

  const revealRole = () => {
    setRevealed((current) => current.includes(activeId) ? current : [...current, activeId])
  }

  const chooseAnswer = (option) => {
    if (activeId === impostorId) return
    setAnswers((current) => activeId === stolenOwnerId
      ? syncImpostorChoice({ ...current, [activeId]: option }, stolenOwnerId, impostorId)
      : { ...current, [activeId]: option })
  }

  const resetRoundState = () => {
    setRoundQuestion(0)
    setPhase(0)
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
      <TopBar title="너 누구야?" showBack={false} action={<BackToRoomGamesControl />} />
      <FlavorToggle value={mode} onChange={changeMode} />
      <ProgressBar current={phase + 1} total={PHASES.length} label={progressLabel} />

      {phase === 0 && (
        <Card className="impostor-secret-card">
          {!revealed.includes(activeId) ? (
            <div className="demo-center">
              <span className="demo-big-icon">🔐</span>
              <h1>{active.name}의 비밀 역할</h1>
              <p>다른 사람은 보지 않도록 가리고 확인하세요.</p>
              <Button onClick={revealRole}>역할 확인</Button>
            </div>
          ) : activeId === impostorId ? (
            <div>
              <Badge tone="positive">PERSONA IMPOSTOR</Badge>
              <h1>{players[1].name}처럼 행동하세요.</h1>
              <p>{players[1].name}의 선택은 자동으로 복제됩니다. 선택 이유는 직접 연기해야 합니다.</p>
              <div className="stolen-persona">
                <small>STOLEN PERSONA</small>
                <b>{players[1].name} · {personas[stolenOwnerId].title}</b>
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
            disabled={activeId === impostorId}
            onSelect={chooseAnswer}
          />
          {activeId === impostorId && (
            <DemoNotice>
              {answers[impostorId] === undefined
                ? `${players[1].name}의 선택을 기다리는 중…`
                : `PERSONA SYNC · ${answers[impostorId] + 1}번 선택 복제 완료`}
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
                    {players
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
          <DemoNotice>투표 완료 {Object.keys(votes).length} / {players.length}</DemoNotice>
        </Card>
      )}

      {phase === 4 && (
        <Card className="impostor-reveal">
          <span>PERSONA BREACH DETECTED</span>
          <h1>서준은<br />IMPOSTOR</h1>
          <p>훔친 Persona는 <b>{players[1].name} · {personas[stolenOwnerId].title}</b></p>
          <p><b>{correctVotes} / {players.length}명</b>이 범인과 Persona를 모두 맞혔습니다.</p>
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
