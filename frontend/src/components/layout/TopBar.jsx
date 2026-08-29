import { useNavigate } from 'react-router-dom'
import './TopBar.css'

export default function TopBar({ title, onBack, showBack = true, right }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) return onBack()
    navigate(-1)
  }

  return (
    <div className="topbar">
      {showBack ? (
        <button className="topbar-back" onClick={handleBack} aria-label="뒤로 가기">
          ←
        </button>
      ) : (
        <span className="topbar-back-spacer" />
      )}
      {title && <span className="topbar-title">{title}</span>}
      {right && <div className="topbar-right">{right}</div>}
    </div>
  )
}
