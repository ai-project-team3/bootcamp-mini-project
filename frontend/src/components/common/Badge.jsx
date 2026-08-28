import './Badge.css'

export default function Badge({ children, tone = 'neutral' }) {
  return <span className={`pbdg pbdg-${tone}`}>{children}</span>
}
