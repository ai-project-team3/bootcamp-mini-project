import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getRoom } from '../../api/rooms'
import { getQuestions } from '../../api/questions'
import ImpressionStep from './ImpressionStep'
import AnswerStep from './AnswerStep'
import TelepathyStep from './TelepathyStep'
import TraitStep from './TraitStep'
import NunchiStep from './NunchiStep'
import LiarStep from './LiarStep'
import TypeGuessStep from './TypeGuessStep'
import StageIntro from './StageIntro'
import './GamePage.css'
import './GameEffects.css'

// 기획안 §4 — 노출도가 오르는 순서. 화면 제목이 곧 단계 이름이다.
const PHASE_TITLES = {
  IMPRESSION_PRE: '첫인상 투표',
  TELEPATHY: '텔레파시',
  ANSWER: '동시에 답하기',
  TRAIT: '○○님은 ___한 사람이다',
  NUNCHI: '눈치 게임',
  LIAR: '라이어 게임',
  IMPRESSION_POST: '첫인상 투표',
  TYPE_GUESS: '누가 나를 맞힐까',
}

export default function GamePage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { playerId } = useRoomFlow()
  const [phase, setPhase] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [error, setError] = useState(null)
  const [intro, setIntro] = useState(null)

  const refreshPhase = useCallback(async () => {
    try {
      const room = await getRoom(code)
      setPhase(room.phase)
    } catch (err) {
      setError(err.message)
    }
  }, [code])

  // 각 단계가 스스로 onAdvance를 부르지만, 그게 어떤 이유로든 안 불리면 화면이
  // 영영 멈춘다. 서버 단계를 주기적으로 확인해 항상 따라가게 둔다.
  useEffect(() => {
    refreshPhase()
    const timer = setInterval(refreshPhase, 2500)
    return () => clearInterval(timer)
  }, [refreshPhase])

  useEffect(() => {
    getQuestions(code).then(setQuestions).catch((err) => setError(err.message))
  }, [code])

  useEffect(() => {
    if (phase === 'DONE') navigate(`/room/${code}/hub`)
  }, [phase, code, navigate])

  // 단계가 바뀌면 이름을 한 번 크게 띄우고 들어간다 (§13-3 단계 전환).
  useEffect(() => {
    if (!phase || phase === 'DONE') return
    setIntro(phase)
    const timer = setTimeout(() => setIntro(null), 1400)
    return () => clearTimeout(timer)
  }, [phase])

  const impressionQuestions = useMemo(
    () =>
      (questions ?? [])
        .filter((q) => q.kind === 'IMPRESSION')
        .map((q) => ({ questionNo: Number(q.slot.slice(1)), text: q.text }))
        .sort((a, b) => a.questionNo - b.questionNo),
    [questions],
  )

  const eitherOrQuestions = useMemo(
    () =>
      (questions ?? [])
        .filter((q) => q.kind === 'BINARY')
        .map((q) => ({ questionNo: Number(q.slot.slice(1)), situation: q.situation, a: q.choice_a, b: q.choice_b }))
        .sort((a, b) => a.questionNo - b.questionNo),
    [questions],
  )

  if (!playerId) {
    return (
      <PhoneFrame>
        <TopBar title="얼음땡" showBack={false} />
        <p className="game-hint">플레이어 정보가 없어요. 처음부터 다시 시작해주세요.</p>
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame>
      <TopBar title={PHASE_TITLES[phase] ?? '얼음땡'} showBack={false} />
      {error && <p className="game-error">{error}</p>}
      {phase && !questions && !error && <p className="game-hint">문항을 불러오는 중...</p>}
      {phase === 'IMPRESSION_PRE' && questions && (
        <ImpressionStep
          code={code}
          playerId={playerId}
          round="pre"
          questions={impressionQuestions}
          onAdvance={refreshPhase}
        />
      )}
      {phase === 'ANSWER' && questions && (
        <AnswerStep code={code} playerId={playerId} questions={eitherOrQuestions} onAdvance={refreshPhase} />
      )}
      {phase === 'IMPRESSION_POST' && questions && (
        <ImpressionStep
          code={code}
          playerId={playerId}
          round="post"
          questions={impressionQuestions}
          onAdvance={refreshPhase}
        />
      )}
      {phase === 'TELEPATHY' && (
        <TelepathyStep code={code} playerId={playerId} onAdvance={refreshPhase} />
      )}
      {phase === 'TRAIT' && <TraitStep code={code} playerId={playerId} onAdvance={refreshPhase} />}
      {phase === 'NUNCHI' && <NunchiStep code={code} playerId={playerId} onAdvance={refreshPhase} />}
      {phase === 'LIAR' && <LiarStep code={code} playerId={playerId} onAdvance={refreshPhase} />}
      {phase === 'TYPE_GUESS' && <TypeGuessStep code={code} playerId={playerId} onAdvance={refreshPhase} />}
      {!phase && !error && <p className="game-hint">불러오는 중...</p>}
      {intro && <StageIntro label={PHASE_TITLES[intro] ?? ''} />}
    </PhoneFrame>
  )
}
