import './IceLogo.css'

/**
 * 얼음땡 워드마크.
 *
 * 이름이 곧 게임이다 — 얼어 있다가 누가 `땡` 하면 풀린다. 그래서 금을
 * **얼음과 땡 사이**에 세로로 세운다. 얼음은 언 채로 남고, 땡이 그 금을 따라
 * 떨어져 나간다. 색도 같은 자리에서 갈린다 — 얼음은 언 파랑, 땡은 풀리는
 * 핑크. 금과 색이 같은 선에서 갈리니 로고 하나가 이름 뜻을 그대로 말한다.
 *
 * 처음에는 금을 가로로 그었는데, 글자를 가로지르는 선은 무슨 모양이든
 * 취소선으로 읽힌다. 깨짐은 세로로 가야 깨짐이 된다.
 *
 * 금이 금으로 보이려면 세 가지가 필요하다.
 * - **불규칙해야 한다.** 등간격 지그재그는 꺾은선 그래프다.
 * - **갈래가 있어야 한다.** 얼음은 한 줄로만 깨지지 않는다. 부딪힌 자리에서
 *   실금이 퍼진다.
 * - **선이 아니라 틈이어야 한다.** 흰 줄을 얹으면 글자 위 낙서가 된다.
 *   굵은 쪽을 바탕색으로 두고 윗입술에만 빛을 얹는다.
 */

// 본금 — 음과 땡 사이를 위에서 아래로 지난다. 자르는 데 쓰는 선은 글자 상자
// 밖까지 나가야 두 조각이 빈틈없이 갈린다.
const CRACK = [
  [66, -4], [62, 12], [69, 26], [63, 40], [70, 54], [64, 68], [71, 82], [66, 104],
]

// 눈에 보이는 금은 글자 높이 안에서만 그린다. 상자 끝까지 그으면 글자가 없는
// 허공에 선이 떠서 금이 아니라 구분선으로 보인다.
const VISIBLE = [
  [64, 10], [62, 16], [69, 27], [63, 40], [70, 54], [64, 68], [70, 80], [67, 90],
]

// 실금 — 깨진 자리에서 퍼진다. 둘이면 충분하되 **서로 다른 쪽으로** 가야
// 한다. 같은 각도로 나란히 두 개를 뻗으면 금이 아니라 화살표 두 개로 읽힌다.
const BRANCHES = [
  [[63, 40], [54, 31]],
  [[70, 54], [78, 64]],
]

const pts = (list) => list.map(([x, y]) => `${x},${y}`).join(' ')
const edge = CRACK.map(([x, y]) => `${x}% ${y}%`).join(', ')
const frozen = `polygon(0% 0%, ${edge}, 0% 100%)`
const freed = `polygon(${edge}, 100% 100%, 100% 0%)`

// 금이 완성되는 순간 튀는 조각. 금을 따라 흩어진다.
const SHARDS = [
  { x: '64%', y: '18%', dx: '13px', dy: '-15px', r: '40deg', d: '0.6s' },
  { x: '67%', y: '34%', dx: '19px', dy: '-5px', r: '-30deg', d: '0.66s' },
  { x: '63%', y: '52%', dx: '-14px', dy: '-12px', r: '25deg', d: '0.62s' },
  { x: '69%', y: '70%', dx: '17px', dy: '14px', r: '-45deg', d: '0.7s' },
  { x: '64%', y: '84%', dx: '-11px', dy: '17px', r: '55deg', d: '0.64s' },
]

export default function IceLogo({ word = '얼음', tail = '땡' }) {
  return (
    <div className="icelogo" role="img" aria-label={`${word}${tail}`}>
      <span className="icelogo-piece icelogo-frozen" aria-hidden style={{ clipPath: frozen }}>
        {word}
        <b>{tail}</b>
      </span>
      <span className="icelogo-piece icelogo-freed" aria-hidden style={{ clipPath: freed }}>
        {word}
        <b>{tail}</b>
      </span>

      <svg className="icelogo-crack" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <g className="icelogo-crack-gap">
          <polyline points={pts(VISIBLE)} />
          {BRANCHES.map((branch, i) => (
            <polyline key={i} points={pts(branch)} />
          ))}
        </g>
        <g className="icelogo-crack-lip">
          <polyline points={pts(VISIBLE)} />
          {BRANCHES.map((branch, i) => (
            <polyline key={i} points={pts(branch)} />
          ))}
        </g>
      </svg>

      {SHARDS.map((shard, i) => (
        <span
          key={i}
          className="icelogo-shard"
          aria-hidden
          style={{
            left: shard.x,
            top: shard.y,
            '--dx': shard.dx,
            '--dy': shard.dy,
            '--r': shard.r,
            '--d': shard.d,
          }}
        />
      ))}
    </div>
  )
}
