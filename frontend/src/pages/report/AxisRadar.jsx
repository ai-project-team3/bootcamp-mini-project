import './AxisRadar.css'

const SIZE = 240
const CENTER = SIZE / 2
const MAX_RADIUS = 84
const MAX_VALUE = 5

function pointFor(index, count, value) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2
  const radius = (value / MAX_VALUE) * MAX_RADIUS
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)]
}

function labelPointFor(index, count) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2
  const radius = MAX_RADIUS + 20
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)]
}

function polygonPoints(axes, key) {
  return axes.map((axis, i) => pointFor(i, axes.length, axis[key] ?? 0).join(',')).join(' ')
}

function ringPoints(axes, value) {
  return axes.map((_, i) => pointFor(i, axes.length, value).join(',')).join(' ')
}

// axes: [{ code, label, self, pre }] — self=채움(오늘의 나), pre=점선(첫인상)
//
// 원래는 pre/post 두 점선을 같이 그렸는데, 셋을 겹치니 화면이 복잡해지고
// post에 쓰던 --deep(파란색)이 남색 배경 위에서 거의 안 보였다. "처음 본
// 인상 vs 실제로 드러난 나" 대비가 제일 이야기가 되는 조합이라 pre만 남기고,
// 대신 금색(--gold)처럼 배경과 확실히 대비되는 색만 쓴다.
//
// 그리는 순서가 곧 z-order다. self는 안이 꽉 찬 도형이라 맨 위에 그리면
// pre 점선을 덮어버린다. 그래서 배경 오각형 →중간눈금 → 축 선 → self(채움)
// → pre(테두리만) 순으로 그려, 점선이 항상 self 위에 보이게 한다.
export default function AxisRadar({ axes }) {
  return (
    <div className="radar-wrap">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {axes.map((axis, i) => {
          const [x, y] = labelPointFor(i, axes.length)
          return (
            <text key={axis.code} x={x} y={y} textAnchor="middle" className="radar-axis-label">
              {axis.label}
            </text>
          )
        })}
        {/* 최대치(5.0) 오각형 — 맨 아래 배경. */}
        <polygon points={ringPoints(axes, MAX_VALUE)} className="radar-bg" />
        {/* 중간(절반) 눈금 — 아주 얇은 점선. */}
        <polygon
          points={ringPoints(axes, MAX_VALUE / 2)}
          fill="none"
          stroke="var(--line)"
          strokeWidth="0.5"
          strokeDasharray="1.5 2"
        />
        {/* 축 5개 — 중심에서 각 꼭짓점까지 가는 얇은 선. */}
        {axes.map((axis, i) => {
          const [x, y] = pointFor(i, axes.length, MAX_VALUE)
          return (
            <line
              key={`spoke-${axis.code}`}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="var(--line)"
              strokeWidth="0.5"
            />
          )
        })}
        <polygon
          points={polygonPoints(axes, 'self')}
          fill="var(--hot-soft)"
          stroke="var(--hot)"
          strokeWidth="2"
          opacity="0.85"
        />
        <polygon
          points={polygonPoints(axes, 'pre')}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1.8"
          strokeDasharray="4 3"
        />
      </svg>
      <div className="radar-legend">
        <span><i className="radar-dot radar-dot-self" /> 오늘의 나</span>
        <span><i className="radar-dot radar-dot-pre" /> 처음에 본 나</span>
      </div>
    </div>
  )
}
