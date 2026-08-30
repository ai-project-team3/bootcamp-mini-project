import { useEffect, useRef, useState } from 'react'
import { getNunchiState, pressNunchi } from '../../api/nunchi'

const POLL_MS = 500
const SETTLE_MS = 3200
const RESULT_MS = 3000

// 폭죽 색 — 유형 팔레트에서 밝은 쪽만 골랐다. 어두운 바탕에서 살아야 한다.
const CONFETTI = ['#FF2E88', '#FFC531', '#C6FF4E', '#2E86FF', '#7FD8C9', '#FF6B35']
const CONFETTI_COUNT = 22
const SHARD_COUNT = 14

// 원 둘레로 고르게 흩되 살짝 어긋나게 — 완전히 규칙적이면 폭발로 안 보인다.
const spray = (count, seed) =>
  Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i + ((i * seed) % 17) - 8
    const dist = 90 + ((i * seed * 7) % 70)
    return { angle, dist, i }
  })

const BOOM_SHARDS = spray(SHARD_COUNT, 5)
const CONFETTI_BITS = spray(CONFETTI_COUNT, 3)

// 기획안 §4-6 — 버튼 하나. 먼저 누른 순서대로 살고, 붙어서 누른 둘과 끝까지
// 안 누른 한 명이 걸린다. 화면에 볼 게 없다는 것이 전부다 — 답이 여기 없으니
// 남을 봐야 이긴다.
export default function NunchiStep({ code, playerId, onHold, onAdvance }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)
  const advanced = useRef(false)
  const lastShown = useRef(0)
  const [result, setResult] = useState(null) // { failed: bool } — 이번 판 내 결과
  // 서버는 다음 판에 누가 한 번이라도 누르기 전까지 방금 끝난 판을 계속
  // 보여준다(그래야 결과가 화면에 뜬다). 그래서 결과를 다 본 뒤에도 서버
  // 상태는 여전히 "끝난 판"이라 버튼이 잠겨 있다 — 넘어갈 준비가 됐다는 걸
  // 따로 들고 있다가 버튼을 먼저 풀어준다.
  const [readyForNext, setReadyForNext] = useState(false)

  useEffect(() => {
    let cancelled = false
    const poll = () => {
      getNunchiState(code, playerId)
        .then((s) => {
          if (cancelled) return
          setState(s)
          if (s.stage === 'RESULT' && lastShown.current !== s.round_no) {
            lastShown.current = s.round_no
            setResult({ failed: s.i_failed })
            // 마지막 판이면 서버 단계가 이미 넘어가 있다. 연출이 끝날 때까지
            // 화면을 붙잡지 않으면 폭발도 폭죽도 못 보고 지나간다.
            onHold?.()
            if (navigator.vibrate) navigator.vibrate(s.i_failed ? [90, 70, 90] : 35)
          }
          if (s.finished && !advanced.current) {
            advanced.current = true
            setTimeout(() => {
              if (!cancelled) onAdvance()
            }, SETTLE_MS)
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
  }, [code, playerId, onHold, onAdvance])

  useEffect(() => {
    if (state?.stage === 'RUNNING') {
      setResult(null)
      setReadyForNext(false)
    }
  }, [state?.stage])

  // 결과를 잠깐 보여준 뒤 알아서 다음 판 버튼으로 돌아간다.
  useEffect(() => {
    if (!result || state?.finished) return
    const timer = setTimeout(() => {
      setResult(null)
      setReadyForNext(true)
    }, RESULT_MS)
    return () => clearTimeout(timer)
  }, [result, state?.finished])

  const press = () => {
    pressNunchi(code, playerId)
      .then(setState)
      .catch((err) => {
        // "이미 눌렀습니다" / "이 판은 끝났습니다"는 화면이 이미 아는 상태다.
        if (!/이미|끝났/.test(String(err.message))) setError(err.message)
      })
  }

  if (error) return <p className="game-error">{error}</p>
  if (!state) return <p className="game-hint">불러오는 중...</p>

  const showing = result !== null
  const failed = result?.failed === true
  const iPressedNow = state.i_pressed && !readyForNext

  // 버튼은 결과가 나와도 자리를 지킨다. 연출은 그 뒤에서 터진다 — 무엇이
  // 터졌는지가 아니라 내 버튼이 어떻게 됐는지가 읽혀야 한다.
  const stage = (
    <div className="nunchi-stage">
      {showing && (
        <div className={`nunchi-burst ${failed ? 'boom' : 'party'}`} aria-hidden>
          <span className="nunchi-wave" />
          {failed
            ? BOOM_SHARDS.map(({ angle, dist, i }) => (
                <span
                  key={i}
                  className="nunchi-shard"
                  style={{ '--a': `${angle}deg`, '--d': `${dist}px`, '--i': i }}
                />
              ))
            : CONFETTI_BITS.map(({ angle, dist, i }) => (
                <span
                  key={i}
                  className="nunchi-confetti"
                  style={{
                    '--a': `${angle}deg`,
                    '--d': `${dist}px`,
                    '--i': i,
                    '--c': CONFETTI[i % CONFETTI.length],
                  }}
                />
              ))}
        </div>
      )}
      <button
        className={`nunchi-btn${showing ? (failed ? ' is-boom' : ' is-party') : ''}`}
        onClick={press}
        disabled={showing || iPressedNow}
      >
        {showing ? (failed ? '💥' : '🎉') : iPressedNow ? '대기' : '지금!'}
      </button>
    </div>
  )

  return (
    <div className={`nunchi${showing ? (failed ? ' boomed' : ' cheered') : ''}`}>
      <p className="nunchi-round">
        {state.round_no} / {state.total_rounds}판
      </p>

      {showing ? (
        <>
          <p className="nunchi-verdict">{failed ? '걸렸습니다' : '살았습니다'}</p>
          {stage}
          <p className="nunchi-cap">
            {failed
              ? state.i_pressed
                ? '동시에 눌렀습니다'
                : '끝까지 안 눌렀습니다'
              : state.failed.length > 0
                ? `${state.failed.join(' · ')}님이 걸렸습니다`
                : '아무도 안 걸렸습니다'}
          </p>
          {state.order.length > 0 && <p className="nunchi-order">{state.order.join(' → ')}</p>}
        </>
      ) : (
        <>
          <p className="nunchi-big">{readyForNext ? 0 : state.pressed}</p>
          <p className="nunchi-cap">
            {iPressedNow ? '눌렀습니다. 남은 사람을 보세요' : '남들보다 먼저, 겹치지 않게'}
          </p>
          {stage}
          <p className="nunchi-hint">
            둘이 동시에 누르면 둘 다 걸립니다. <b>끝까지 안 누른 한 명도 걸립니다</b>
          </p>
        </>
      )}
    </div>
  )
}
