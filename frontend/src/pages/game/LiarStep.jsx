import { useEffect, useRef, useState } from 'react'
import Button from '../../components/common/Button'
import { getPlayers } from '../../api/players'
import {
  accuseLiar,
  getLiarState,
  guessLiarWord,
  markLiarSeen,
  nextLiarRound,
  nextLiarSpeaker,
  voteLiarContinue,
} from '../../api/liar'

const POLL_MS = 900
const SPEAK_SECONDS = 15
const WORD_PEEK_MS = 3000

// 기획안 §4-7 — 넷은 "치킨", 한 명만 "피자". 말은 입으로 하고 화면은 차례만
// 넘긴다. 음성은 어디에서도 다루지 않는다.
export default function LiarStep({ code, playerId, onAdvance }) {
  const [state, setState] = useState(null)
  const [players, setPlayers] = useState([])
  const [peeking, setPeeking] = useState(false)
  const [voted, setVoted] = useState(false)
  const [accused, setAccused] = useState(false)
  const [wordDraft, setWordDraft] = useState('')
  const [left, setLeft] = useState(SPEAK_SECONDS)
  const [error, setError] = useState(null)
  const advanced = useRef(false)

  useEffect(() => {
    getPlayers(code).then(setPlayers).catch((err) => setError(err.message))
  }, [code])

  useEffect(() => {
    let cancelled = false
    const poll = () => {
      getLiarState(code, playerId)
        .then((s) => {
          if (cancelled) return
          setState((prev) => {
            if (prev?.stage !== s.stage || prev?.round_no !== s.round_no) {
              setVoted(false)
              setAccused(false)
            }
            return s
          })
          if (s.stage === 'DONE' && !advanced.current) {
            advanced.current = true
            onAdvance()
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
  }, [code, playerId, onAdvance])

  // 내 차례일 때만 카운트다운을 돌리고, 다 되면 다음 사람으로 넘긴다.
  const isSpeaker = state?.stage === 'SPEAK' && state.speaker_player_id === playerId
  useEffect(() => {
    if (!isSpeaker) {
      setLeft(SPEAK_SECONDS)
      return
    }
    setLeft(SPEAK_SECONDS)
    const timer = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(timer)
          nextLiarSpeaker(code).catch(() => {})
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isSpeaker, code, state?.speaker_player_id, state?.lap])

  const peek = () => {
    setPeeking(true)
    markLiarSeen(code, playerId).then(setState).catch((err) => setError(err.message))
    setTimeout(() => setPeeking(false), WORD_PEEK_MS)
  }

  if (error) return <p className="game-error">{error}</p>
  if (!state) return <p className="game-hint">불러오는 중...</p>

  const others = players.filter((p) => p.id !== playerId)

  if (state.stage === 'WORD') {
    return (
      <div className="liar-step">
        <p className="liar-round">
          {state.round_no} / {state.total_rounds}판
        </p>
        {peeking ? (
          <div className={`liar-word${state.am_i_liar ? ' liar' : ''}`}>
            <p className="liar-word-label">{state.am_i_liar ? '당신만 다른 단어입니다' : '제시어'}</p>
            <p className="liar-word-text">{state.my_word}</p>
            <p className="liar-word-hint">3초 뒤 사라집니다</p>
          </div>
        ) : (
          <button className="liar-peek" onClick={peek}>
            눌러서 제시어 확인
          </button>
        )}
        <p className="liar-cap">
          {state.seen} / {state.total}명 확인
        </p>
        <p className="liar-hint">옆 사람이 못 보게 가리고 확인하세요</p>
      </div>
    )
  }

  if (state.stage === 'SPEAK') {
    return (
      <div className="liar-step">
        <p className="liar-round">
          {state.lap}바퀴째
        </p>
        {isSpeaker ? (
          <div className="liar-turn mine">
            <div className="liar-ring" style={{ '--p': `${(left / SPEAK_SECONDS) * 100}%` }}>
              <span>{left}</span>
            </div>
            <p className="liar-turn-name">내 차례입니다</p>
            <p className="liar-hint">제시어를 직접 말하지 말고 설명하세요</p>
            <Button variant="secondary" onClick={() => nextLiarSpeaker(code)}>
              다 말했어요
            </Button>
          </div>
        ) : (
          <div className="liar-turn">
            <p className="liar-turn-name">{state.speaker_nickname}님 차례</p>
            <p className="liar-hint">화면 말고 사람을 보세요</p>
          </div>
        )}
      </div>
    )
  }

  if (state.stage === 'VOTE') {
    return (
      <div className="liar-step">
        <p className="liar-prompt">한 바퀴 더 돌까요?</p>
        {voted ? (
          <div className="game-waiting">
            <p>다들 정하는 중...</p>
            <div className="game-dots">
              {Array.from({ length: state.total }, (_, i) => (
                <span key={i} className={i < state.voted ? 'game-dot on' : 'game-dot'} />
              ))}
            </div>
          </div>
        ) : (
          <div className="answer-choices">
            <button
              className="answer-choice-btn choice-a"
              onClick={() => {
                setVoted(true)
                voteLiarContinue(code, playerId, true).then(setState)
              }}
            >
              한 바퀴 더
            </button>
            <button
              className="answer-choice-btn choice-b"
              onClick={() => {
                setVoted(true)
                voteLiarContinue(code, playerId, false).then(setState)
              }}
            >
              지금 지목
            </button>
          </div>
        )}
        <p className="liar-hint">더 돌면 정보가 늘지만 라이어에게도 시간을 줍니다</p>
      </div>
    )
  }

  if (state.stage === 'ACCUSE') {
    return (
      <div className="liar-step">
        <p className="liar-prompt">라이어는 누구일까요?</p>
        {accused ? (
          <div className="game-waiting">
            <p>다들 지목하는 중...</p>
            <div className="game-dots">
              {Array.from({ length: state.total }, (_, i) => (
                <span key={i} className={i < state.accused ? 'game-dot on' : 'game-dot'} />
              ))}
            </div>
          </div>
        ) : (
          <div className="tele-picks">
            {others.map((p) => (
              <button
                key={p.id}
                className="tele-pick"
                onClick={() => {
                  setAccused(true)
                  accuseLiar(code, playerId, p.id).then(setState)
                }}
              >
                {p.nickname}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // REVEAL
  return (
    <div className={`liar-step reveal${state.liar_won ? ' liar-won' : ''}`}>
      <p className="liar-verdict">{state.liar_caught ? '잡혔습니다' : '못 잡았습니다'}</p>
      <p className="liar-answer">
        라이어는 <b>{state.liar_nickname}</b>
      </p>

      {state.word_pending ? (
        // 아직 제시어를 안 보여준다. 답을 보여주고 맞히라고 할 수는 없다.
        state.am_i_liar ? (
          <div className="liar-lastchance">
            <p className="liar-hint">제시어를 맞히면 아직 이길 수 있습니다</p>
            <input
              className="liar-input"
              value={wordDraft}
              onChange={(e) => setWordDraft(e.target.value)}
              placeholder="제시어"
            />
            <Button onClick={() => guessLiarWord(code, playerId, wordDraft).then(setState)}>제출</Button>
          </div>
        ) : (
          <p className="liar-hint">{state.liar_nickname}님이 제시어를 맞히는 중...</p>
        )
      ) : (
        <>
          <p className="liar-answer-word">제시어는 “{state.major_word}”였습니다</p>
          <p className="liar-winner">{state.liar_won ? '라이어 승' : '시민 승'}</p>
          <Button onClick={() => nextLiarRound(code).then(setState)}>
            {state.round_no >= state.total_rounds ? '끝내기' : '다음 판'}
          </Button>
        </>
      )}
    </div>
  )
}
