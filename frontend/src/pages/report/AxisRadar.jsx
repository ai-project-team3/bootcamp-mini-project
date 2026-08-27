import './AxisRadar.css'

const SIZE = 220
const CENTER = SIZE / 2
const MAX_RADIUS = 88
const MAX_VALUE = 5

function pointFor(index, count, value) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2
  const radius = (value / MAX_VALUE) * MAX_RADIUS
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)]
}

function polygonPoints(axes, key) {
  return axes.map((axis, i) => pointFor(i, axes.length, axis[key]).join(',')).join(' ')
}

export default function AxisRadar({ axes }) {
  return (
    <div className="radar-wrap">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <polygon
          points={polygonPoints(axes, 'self')}
          fill="var(--hot-soft)"
          stroke="var(--hot)"
          strokeWidth="2"
        />
        <polygon
          points={polygonPoints(axes, 'impression')}
          fill="none"
          stroke="var(--deep)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      </svg>
      <div className="radar-legend">
        <span>
          <i className="radar-dot radar-dot-self" /> 내가 본 나
        </span>
        <span>
          <i className="radar-dot radar-dot-impression" /> 팀이 본 나
        </span>
      </div>
    </div>
  )
}
