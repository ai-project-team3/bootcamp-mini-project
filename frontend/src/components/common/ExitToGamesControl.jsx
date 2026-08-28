import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from './Button'
import Card from './Card'
import './GameDemoExitControl.css'

/**
 * The way out of any game in the app.
 *
 * Every game leaves the same way — one button in the top bar, one dialog that
 * says what will happen, and a landing back on the game list. What differs is
 * the clean-up each game needs, which arrives as `onLeave`: it releases the
 * room on the server and drops the stored session so nothing of the abandoned
 * game can come back.
 */
export default function ExitToGamesControl({
  label = '게임 목록',
  title = '게임을 끝내고 나갈까요?',
  description,
  confirmLabel = '나가기',
  onLeave,
  to = '/games',
  /** Called at click time: leaving straight away when nothing is running
   *  spares the player a dialog about ending a game they never started. */
  shouldConfirm,
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')

  const leave = async () => {
    setLeaving(true)
    setError('')
    try {
      await onLeave?.()
      navigate(to, { replace: true })
    } catch (err) {
      setError(err.message)
      setLeaving(false)
    }
  }

  const handleTrigger = () => {
    if (shouldConfirm && !shouldConfirm()) {
      leave()
      return
    }
    setOpen(true)
  }

  return (
    <>
      <button className="demo-exit-trigger" type="button" onClick={handleTrigger}>
        {label}
      </button>
      {open && (
        <div className="demo-exit-backdrop" role="presentation">
          <Card className="demo-exit-dialog">
            <h2 id="exit-dialog-title">{title}</h2>
            <p>{description}</p>
            {error && <p className="game-room-error" role="alert">{error}</p>}
            <div className="demo-exit-actions">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={leaving}>취소</Button>
              <Button onClick={leave} disabled={leaving}>
                {leaving ? '나가는 중...' : confirmLabel}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
