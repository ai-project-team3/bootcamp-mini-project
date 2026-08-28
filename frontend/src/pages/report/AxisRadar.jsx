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
        <polygon points={polygonPoints(axes, 'self')} fill="var(--hot-soft)" stroke="var(--hot)" strokeWidth="2" />
      </svg>
      <div className="radar-legend">
        <span><i className="radar-dot radar-dot-self" /> 오늘의 나</span>
        <span><i className="radar-dot radar-dot-pre" /> 처음에 본 나</span>
        <span><i className="radar-dot radar-dot-post" /> 끝나고 본 나</span>
      </div>
    </div>
  )
}
