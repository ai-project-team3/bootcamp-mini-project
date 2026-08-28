import { useEffect, useRef, useState } from 'react'
import { getNunchiState, pressNunchi } from '../../api/nunchi'

const POLL_MS = 500
const SETTLE_MS = 2600

// 기획안 §4-6 — 버튼 하나. 1등부터 순서대로 눌러야 하고 둘이 동시에 누르면 실패.
// 화면에 볼 게 없다는 것이 전부다. 답이 여기 없으니 남을 봐야 이긴다.
export default function NunchiStep({ code, playerId, onAdvance }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)
  const advanced = useRef(false)
  const lastRound = useRef(0)
  const [flash, setFlash] = useState(null) // SUCCESS | FAIL

  useEffect(() => {
    let cancelled = false
    const poll = () => {
      getNunchiState(code, playerId)
        .then((s) => {
          if (cancelled) return
          setState(s)
          if (s.stage === 'SUCCESS' || s.stage === 'FAIL') {
            if (lastRound.current !== s.round_no || flash === null) {
              lastRound.current = s.round_no
              setFlash(s.stage === 'FAIL' ? 'FAIL' : 'SUCCESS')
              if (navigator.vibrate) navigator.vibrate(s.stage === 'FAIL' ? [80, 60, 80] : 40)
            }
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
  }, [code, playerId, onAdvance, flash])

  // 판이 넘어가면 다음 판을 위해 화면을 되돌린다.
  useEffect(() => {
    if (state?.stage === 'RUNNING') setFlash(null)
  }, [state?.stage])

  const press = () => {
    pressNunchi(code, playerId)
      .then(setState)
      .catch((err) => {
        if (!String(err.message).includes('이미')) setError(err.message)
      })
  }

  if (error) return <p className="game-error">{error}</p>
  if (!state) return <p className="game-hint">불러오는 중...</p>

  const tone = flash === 'FAIL' ? 'fail' : flash === 'SUCCESS' ? 'ok' : ''

  return (
    <div className={`nunchi ${tone}`}>
      <p className="nunchi-round">
        {state.round_no} / {state.total_rounds}판
      </p>

      {flash ? (
        <div className="nunchi-result">
          <p className="nunchi-big">{flash === 'FAIL' ? '✕' : state.pressed}</p>
          <p className="nunchi-cap">
            {flash === 'FAIL'
              ? `${state.clashed.join(' · ')} 동시에!`
              : state.finished
                ? '이걸로 끝입니다'
                : '통과했습니다'}
          </p>
          {state.order.length > 0 && <p className="nunchi-order">{state.order.join(' → ')}</p>}
        </div>
      ) : (
        <>
          <p className="nunchi-big">{state.pressed}</p>
          <p className="nunchi-cap">
            {state.i_pressed ? '눌렀습니다. 남은 사람을 기다리는 중' : '순서대로 누르세요'}
          </p>
          <button className="nunchi-btn" onClick={press} disabled={state.i_pressed}>
            {state.i_pressed ? '대기' : '지금!'}
          </button>
          <p className="nunchi-hint">둘이 동시에 누르면 이 판은 실패입니다</p>
        </>
      )}
    </div>
  )
}
