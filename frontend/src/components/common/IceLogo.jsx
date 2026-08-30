import './IceLogo.css'

/**
 * 얼음땡 워드마크 — 얼음을 깎아 만든 글자.
 *
 * 움직이지 않는다. 로고는 매번 같은 모양으로 있어야 로고다.
 *
 * 얼음처럼 보이게 하는 것은 같은 글자를 네 벌 겹치는 일이다.
 *   1. 두께   — 아래로 내려간 짙은 파랑. 덩어리에 높이가 생긴다
 *   2. 테두리 — 머리카락 굵기의 서리
 *   3. 몸통   — 위가 밝고 아래가 짙은 그라디언트. 빛이 위에서 온다
 *   4. 광택   — 위쪽만 남긴 흰 띠. 얼음의 젖은 면
 *
 * 색은 이름을 따라 갈린다. `얼음`은 언 파랑, `땡`은 풀리는 핑크 — 앱이 쓰는
 * 두 색이 그대로 단어 뜻이 된다.
 */
export default function IceLogo({ word = '얼음', tail = '땡' }) {
  const text = (
    <>
      {word}
      <b>{tail}</b>
    </>
  )

  return (
    <div className="icelogo" role="img" aria-label={`${word}${tail}`}>
      <span className="icelogo-layer icelogo-depth" aria-hidden>{text}</span>
      <span className="icelogo-layer icelogo-rim" aria-hidden>{text}</span>
      <span className="icelogo-layer icelogo-body">{text}</span>
      <span className="icelogo-layer icelogo-gloss" aria-hidden>{text}</span>
    </div>
  )
}
