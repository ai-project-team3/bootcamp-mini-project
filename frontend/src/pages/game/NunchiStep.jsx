import { useEffect, useRef, useState } from 'react'
import { getPlayers } from '../../api/players'
import { getNunchiState, pressNunchi } from '../../api/nunchi'

const POLL_MS = 500
const SETTLE_MS = 2600
const REVEAL_MS = 2500

// 기획안 §4-6 — 버튼 하나. 1등부터 순서대로 눌러야 하고 둘이 동시에 누르면 실패.
// 화면에 볼 게 없다는 것이 전부다. 답이 여기 없으니 남을 봐야 이긴다.
export default function NunchiStep({ code, playerId, onAdvance }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)
  const [myNickname, setMyNickname] = useState(null)
  const advanced = useRef(false)
  const lastRound = useRef(0)
  const [flash, setFlash] = useState(null) // SUCCESS | FAIL
  // 서버는 다음 판에 누가 한 번이라도 누르기 전까지는 방금 끝난 판을 계속
  // 보여준다(그래야 결과가 화면에 뜬다). 그런데 그 말은 로컬에서 flash를
  // 지워도 state.i_pressed는 여전히 "방금 판" 기준으로 true라 버튼이 계속
  // 잠겨 있다는 뜻이다 — 그래서 다음 판으로 넘어갈 준비가 됐다는 걸 따로
  // 표시해서, 서버가 실제로 다음 판을 보여줄 때까지 버튼을 풀어준다.
  const [readyForNext, setReadyForNext] = useState(false)

  useEffect(() => {
    getPlayers(code)
      .then((players) => setMyNickname(players.find((p) => p.id === playerId)?.nickname ?? null))
      .catch(() => {})
  }, [code, playerId])

  useEffect(() => {
    let cancelled = false
    const poll = () => {
      getNunchiState(code, playerId)
        .then((s) => {
          if (cancelled) return
          setState(s)
          // lastRound가 이 판을 이미 봤다고 기록해뒀으면 다시 안 띄운다 — 로컬
          // 타이머로 flash를 스스로 지운 뒤에도 서버는 (다음 판에 아무도 안
          // 눌렀으면) 여전히 같은 판을 들고 있을 수 있어서, flash 자체를
          // 조건에 넣으면 지우자마자 바로 다시 켜지는 무한 루프가 된다.
          if ((s.stage === 'SUCCESS' || s.stage === 'FAIL') && lastRound.current !== s.round_no) {
            lastRound.current = s.round_no
            setFlash(s.stage === 'FAIL' ? 'FAIL' : 'SUCCESS')
            if (navigator.vibrate) navigator.vibrate(s.stage === 'FAIL' ? [80, 60, 80] : 40)
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
  }, [code, playerId, onAdvance])

  // 판이 넘어가면 다음 판을 위해 화면을 되돌린다.
  useEffect(() => {
    if (state?.stage === 'RUNNING') {
      setFlash(null)
      setReadyForNext(false)
    }
  }, [state?.stage])

  // 결과 화면을 잠깐 보여준 뒤 알아서 다음 판 버튼으로 돌아간다. 서버가
  // "누가 눌러야 다음 판을 보여준다"는 조건을 걸어둔 탓에, 아무도 안 넘어가면
  // 화면이 결과 화면에 그대로 멈춰 있었다.
  useEffect(() => {
    if (!flash || state?.finished) return
    const timer = setTimeout(() => {
      setFlash(null)
      setReadyForNext(true)
    }, REVEAL_MS)
    return () => clearTimeout(timer)
  }, [flash, state?.finished])

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

  // 동시에 눌러서 판을 깬 사람, 또는 (동시 누름 없이) 제일 늦게 누른 사람에게만
  // 원이 부서지는 연출을 준다 — "내가 꼴찌"라는 게 문장보다 몸으로 와닿게.
  const amIClashed = flash === 'FAIL' && state.clashed.includes(myNickname)
  const amILast =
    flash === 'SUCCESS' &&
    state.order.length > 1 &&
    state.order[state.order.length - 1] === myNickname
  const shattered = amIClashed || amILast
  const iPressedNow = state.i_pressed && !readyForNext

  return (
    <div className={`nunchi ${tone}${shattered ? ' shattered' : ''}`}>
      <p className="nunchi-round">
        {state.round_no} / {state.total_rounds}판
      </p>

      {flash ? (
        <div className="nunchi-result">
          {shattered ? (
            <div className="nunchi-shatter" aria-hidden>
              <span className="nunchi-shard nunchi-shard-1" />
              <span className="nunchi-shard nunchi-shard-2" />
              <span className="nunchi-shard nunchi-shard-3" />
              <span className="nunchi-shard nunchi-shard-4" />
              <span className="nunchi-shatter-face">{flash === 'FAIL' ? '✕' : '🐌'}</span>
            </div>
          ) : (
            <p className="nunchi-big">{flash === 'FAIL' ? '✕' : state.pressed}</p>
          )}
          {shattered && <p className="nunchi-fail-word">{flash === 'FAIL' ? '실패!' : '꼴찌!'}</p>}
          <p className="nunchi-cap">
            {flash === 'FAIL'
              ? `${state.clashed.join(' · ')} 동시에!`
              : amILast
                ? '이번 판은 내가 꼴찌입니다'
                : state.finished
                  ? '이걸로 끝입니다'
                  : '통과했습니다'}
          </p>
          {state.order.length > 0 && <p className="nunchi-order">{state.order.join(' → ')}</p>}
        </div>
      ) : (
        <>
          <p className="nunchi-big">{readyForNext ? 0 : state.pressed}</p>
          <p className="nunchi-cap">
            {iPressedNow ? '눌렀습니다. 남은 사람을 기다리는 중' : '순서대로 누르세요'}
          </p>
          <button className="nunchi-btn" onClick={press} disabled={iPressedNow}>
            {iPressedNow ? '대기' : '지금!'}
          </button>
          <p className="nunchi-hint">둘이 동시에 누르면 이 판은 실패입니다</p>
        </>
      )}
    </div>
  )
}
