import './ProgressBar.css'

export default function ProgressBar({ current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="pprog">
      <div className="pprog-track">
        <div className="pprog-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="pprog-label">{label ?? `${current}/${total}`}</span>
    </div>
  )
}
