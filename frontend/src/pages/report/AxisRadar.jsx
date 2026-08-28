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

// axes: [{ code, label, self, pre, post }] — self=실선(오늘의 나), pre/post=점선(첫인상 전/후)
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
        {/* 최대치(5.0) 오각형 — 맨 아래 배경. 연한 파란색으로 채워서 다른 배경면과
            구별되게 하고, 그래프 전체 크기 감도 잡게 한다. */}
        <polygon points={ringPoints(axes, MAX_VALUE)} fill="var(--deep)" fillOpacity="0.15" stroke="var(--deep)" strokeOpacity="0.4" strokeWidth="1" />
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
        {/* self(오늘의 나)는 안쪽이 채워져 있어서 최대치 배경 바로 위에 깔아야 한다 —
            먼저 그리면 나중에 그리는 pre/post 테두리 선이 그 위에 그대로 보인다. */}
        <polygon points={polygonPoints(axes, 'self')} fill="var(--hot-soft)" stroke="var(--hot)" strokeWidth="2" />
        <polygon
          points={polygonPoints(axes, 'pre')}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1.3"
          strokeDasharray="3 3"
          opacity="0.7"
        />
        <polygon
          points={polygonPoints(axes, 'post')}
          fill="none"
          stroke="var(--deep)"
          strokeWidth="1.6"
          strokeDasharray="5 3"
        />
      </svg>
      <div className="radar-legend">
        <span><i className="radar-dot radar-dot-self" /> 오늘의 나</span>
        <span><i className="radar-dot radar-dot-pre" /> 처음에 본 나</span>
        <span><i className="radar-dot radar-dot-post" /> 끝나고 본 나</span>
      </div>
    </div>
  )
}
