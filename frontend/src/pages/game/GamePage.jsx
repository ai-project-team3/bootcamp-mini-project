import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getRoom } from '../../api/rooms'
import { getQuestions } from '../../api/questions'
import ImpressionStep from './ImpressionStep'
import AnswerStep from './AnswerStep'
import TypeGuessStep from './TypeGuessStep'
import './GamePage.css'

const PHASE_TITLES = {
  IMPRESSION_PRE: '첫인상 투표',
  ANSWER: '동시에 답하기',
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

  const refreshPhase = useCallback(async () => {
    try {
      const room = await getRoom(code)
      setPhase(room.phase)
    } catch (err) {
      setError(err.message)
    }
  }, [code])

  useEffect(() => {
    refreshPhase()
  }, [refreshPhase])

  useEffect(() => {
    getQuestions(code).then(setQuestions).catch((err) => setError(err.message))
  }, [code])

  useEffect(() => {
    if (phase === 'STATEMENT') navigate(`/room/${code}/statements`)
    if (phase === 'DONE') navigate(`/room/${code}/hub`)
  }, [phase, code, navigate])

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
      {phase === 'TYPE_GUESS' && <TypeGuessStep code={code} playerId={playerId} onAdvance={refreshPhase} />}
      {!phase && !error && <p className="game-hint">불러오는 중...</p>}
    </PhoneFrame>
  )
}
