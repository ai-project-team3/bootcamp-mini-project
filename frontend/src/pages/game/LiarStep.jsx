import { useCallback, useEffect, useRef, useState } from 'react'
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

// 손을 대고 있는 동안만 제시어를 보여주고 떼면 가린다. 3초짜리 타이머로
// 보여주고 마는 방식이면, 말을 해야 하는 이 게임에서 "내 단어 뭐였지"의 답이
// 화면에 없다 — 단어를 확인하는 일은 언제든 다시 할 수 있어야 한다.
function WordHold({ word, isLiar, hint, onFirstPeek }) {
  const [held, setHeld] = useState(false)
  const peeked = useRef(false)

  const start = (e) => {
    e.preventDefault()
    setHeld(true)
    if (!peeked.current) {
      peeked.current = true
      onFirstPeek?.()
    }
  }
  const stop = () => setHeld(false)

  return (
    <button
      type="button"
      className={`liar-hold${held ? ' held' : ''}${held && isLiar ? ' liar' : ''}`}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {held ? (
        <>
          <span className="liar-hold-label">{isLiar ? '당신만 다른 단어입니다' : '제시어'}</span>
          <span className="liar-hold-word">{word ?? '???'}</span>
        </>
      ) : (
        <>
          <span className="liar-hold-lock">🔒</span>
          <span className="liar-hold-label">{hint ?? '꾹 누르고 있는 동안 보입니다'}</span>
        </>
      )}
    </button>
  )
}

// 기획안 §4-7 — 넷은 "치킨", 한 명만 "피자". 말은 입으로 하고 화면은 차례만
// 넘긴다. 음성은 어디에서도 다루지 않는다.
export default function LiarStep({ code, playerId, onAdvance }) {
  const [state, setState] = useState(null)
  const [players, setPlayers] = useState([])
  const [voted, setVoted] = useState(false)
  const [accusePick, setAccusePick] = useState(null)
  const [accused, setAccused] = useState(false)
  const [wordDraft, setWordDraft] = useState('')
  const [peeked, setPeeked] = useState(false)
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
              setAccusePick(null)
              setWordDraft('')
              setPeeked(false)
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

  // 차례를 넘기는 일은 이 사람당 딱 한 번이어야 한다. next-speaker는 "누구
  // 다음"인지를 받지 않고 그냥 한 칸 미는 엔드포인트라, 두 번 불리면 한 명이
  // 통째로 건너뛰어진다. StrictMode에서 상태 갱신 함수가 두 번 실행되기 때문에
  // setLeft 안에서 부르던 예전 방식은 매번 두 칸씩 넘어갔다. 시간이 다 됐다는
  // 사실만 상태로 남기고, 넘기는 일은 effect에서 한 번만 한다.
  const handedOff = useRef(false)
  useEffect(() => {
    handedOff.current = false
    setLeft(SPEAK_SECONDS)
  }, [isSpeaker, state?.speaker_player_id, state?.lap])

  const handOff = useCallback(() => {
    if (handedOff.current) return
    handedOff.current = true
    nextLiarSpeaker(code).catch(() => {})
  }, [code])

  useEffect(() => {
    if (!isSpeaker) return
    const timer = setInterval(() => setLeft((v) => (v <= 0 ? 0 : v - 1)), 1000)
    return () => clearInterval(timer)
  }, [isSpeaker, state?.speaker_player_id, state?.lap])

  useEffect(() => {
    if (isSpeaker && left <= 0) handOff()
  }, [isSpeaker, left, handOff])

  if (error) return <p className="game-error">{error}</p>
  if (!state) return <p className="game-hint">불러오는 중...</p>

  const others = players.filter((p) => p.id !== playerId)
  const lastLap = state.last_lap === true

  if (state.stage === 'WORD') {
    return (
      <div className="liar-step">
        <p className="liar-round">
          {state.round_no} / {state.total_rounds}판
        </p>
        <p className="liar-prompt">제시어를 확인하세요</p>
        <WordHold
          word={state.my_word}
          isLiar={state.am_i_liar}
          hint="꾹 누르고 있는 동안만 보입니다"
          onFirstPeek={() => setPeeked(true)}
        />
        <p className="liar-hint">
          한 명만 다른 단어를 받습니다. 돌아가며 <b>제시어를 설명</b>하고, 설명이
          어긋나는 사람을 찾아 지목합니다
        </p>
        {/* 확인하자마자 넘어가면 단어를 곱씹을 틈이 없다. 준비됐다고 스스로
            말한 사람만 세고, 전원이 준비되면 시작한다. */}
        {state.i_am_seen ? (
          <div className="game-waiting">
            <p>다른 사람들을 기다리는 중...</p>
            <div className="game-dots">
              {Array.from({ length: state.total }, (_, i) => (
                <span key={i} className={i < state.seen ? 'game-dot on' : 'game-dot'} />
              ))}
            </div>
          </div>
        ) : (
          <Button
            disabled={!peeked}
            onClick={() => markLiarSeen(code, playerId).then(setState).catch(() => {})}
          >
            {peeked ? '준비됐어요' : '먼저 제시어를 확인하세요'}
          </Button>
        )}
      </div>
    )
  }

  if (state.stage === 'SPEAK') {
    return (
      <div className="liar-step">
        <p className="liar-round">
          {state.lap}바퀴째{lastLap ? ' (마지막)' : ''}
        </p>
        {isSpeaker ? (
          <div className="liar-turn mine">
            <div className="liar-ring" style={{ '--p': `${(left / SPEAK_SECONDS) * 100}%` }}>
              <span>{left}</span>
            </div>
            <p className="liar-turn-name">내 차례입니다</p>
            <p className="liar-hint">제시어를 그대로 말하지 않고 설명합니다</p>
            <Button variant="secondary" onClick={handOff}>
              다 말했어요
            </Button>
          </div>
        ) : (
          <div className="liar-turn">
            <p className="liar-turn-name">{state.speaker_nickname}님 차례</p>
            <p className="liar-hint">설명이 어딘가 어긋나지 않는지 들어보세요</p>
          </div>
        )}
        {/* 말하는 동안에도 자기 단어는 언제든 다시 볼 수 있어야 한다. */}
        <WordHold word={state.my_word} isLiar={state.am_i_liar} hint="내 제시어 확인" />
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
        <p className="liar-hint">
          많은 쪽으로 갑니다. 더 돌면 정보가 늘지만 라이어에게도 시간을 줍니다
        </p>
        <WordHold word={state.my_word} isLiar={state.am_i_liar} hint="내 제시어 확인" />
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
          <>
            <div className="tele-picks">
              {others.map((p) => (
                <button
                  key={p.id}
                  className={`tele-pick${accusePick === p.id ? ' picked' : ''}`}
                  onClick={() => setAccusePick(p.id)}
                >
                  {p.nickname}
                </button>
              ))}
            </div>
            <Button
              disabled={!accusePick}
              onClick={() => {
                setAccused(true)
                accuseLiar(code, playerId, accusePick).then(setState)
              }}
            >
              지목하기
            </Button>
          </>
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
            <Button
              disabled={!wordDraft.trim()}
              onClick={() => guessLiarWord(code, playerId, wordDraft).then(setState)}
            >
              제출
            </Button>
          </div>
        ) : (
          <p className="liar-hint">{state.liar_nickname}님이 제시어를 맞히는 중...</p>
        )
      ) : (
        <>
          <p className="liar-answer-word">제시어는 “{state.major_word}”였습니다</p>
          <p className="liar-winner">{state.liar_won ? '라이어 승' : '시민 승'}</p>
          {state.i_am_ready ? (
            <div className="game-waiting">
              <p>다른 사람들을 기다리는 중...</p>
              <div className="game-dots">
                {Array.from({ length: state.total }, (_, i) => (
                  <span key={i} className={i < state.ready ? 'game-dot on' : 'game-dot'} />
                ))}
              </div>
            </div>
          ) : (
            <Button onClick={() => nextLiarRound(code, playerId).then(setState)}>
              {state.round_no >= state.total_rounds ? '끝내기' : '다음 판'}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
