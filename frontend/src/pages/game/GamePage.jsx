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
// 단계 이름 밑에 한 줄로 붙는 규칙. 전환 화면이 어차피 떠 있는 동안 읽힌다.
const PHASE_RULES = {
  IMPRESSION_PRE: '아직 아무것도 모릅니다. 느낌만으로 한 명씩 고르세요',
  TELEPATHY: '내 답을 고르고, 나와 같은 걸 고를 것 같은 사람을 짚습니다',
  ANSWER: '둘 중 하나. 누가 뭘 골랐는지는 공개하지 않고 수만 보여줍니다',
  TRAIT: '내 답을 먼저 고르고, 한 명씩 돌아가며 남의 답을 맞힙니다',
  NUNCHI: '먼저 누르되 겹치면 안 됩니다. 끝까지 안 누른 한 명도 걸립니다',
  LIAR: '한 명만 다른 단어입니다. 돌아가며 한마디씩 하고 지목합니다',
  IMPRESSION_POST: '같은 다섯 문항을 다시. 바뀌었는지만 봅니다',
  TYPE_GUESS: '카드마다 주인을 고릅니다. 한 장은 당신 것입니다',
}

const PHASE_TITLES = {
  IMPRESSION_PRE: '첫인상 투표',
  TELEPATHY: '텔레파시',
  ANSWER: '동시에 답하기',
  TRAIT: '○○님은 ___한 사람이다',
  NUNCHI: '눈치 게임',
  LIAR: '라이어 게임',
  IMPRESSION_POST: '첫인상 다시 보기',
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
  const [revealSeen, setRevealSeen] = useState(false)

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

  // 마지막 사람이 제출하는 순간 방은 DONE이 되지만, 그때 바로 허브로 보내면
  // 유형 공개 화면을 아무도 못 본다. 그 화면이 이 판의 결과물이므로 스스로
  // 끝났다고 할 때까지 붙잡는다.
  useEffect(() => {
    if (phase === 'DONE' && revealSeen) navigate(`/room/${code}/hub`)
  }, [phase, revealSeen, code, navigate])

  // 단계가 바뀌면 이름을 한 번 크게 띄우고 들어간다 (§13-3 단계 전환).
  useEffect(() => {
    if (!phase || phase === 'DONE') return
    setIntro(phase)
    // 이름만 띄울 때는 1.4초였는데, 밑에 규칙 한 줄이 붙었으니 읽을 시간을 준다.
    const timer = setTimeout(() => setIntro(null), 2200)
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
      <TopBar title={PHASE_TITLES[phase === 'DONE' ? 'TYPE_GUESS' : phase] ?? '얼음땡'} showBack={false} />
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
      {(phase === 'TYPE_GUESS' || (phase === 'DONE' && !revealSeen)) && (
        <TypeGuessStep code={code} playerId={playerId} onAdvance={() => setRevealSeen(true)} />
      )}
      {!phase && !error && <p className="game-hint">불러오는 중...</p>}
      {intro && <StageIntro label={PHASE_TITLES[intro] ?? ''} rule={PHASE_RULES[intro]} />}
    </PhoneFrame>
  )
}
