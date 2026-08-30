import './PhoneFrame.css'

/**
 * The shared phone shell every screen sits in.
 *
 * `tone="dark"` is for screens that own a dark palette — the mafia game and
 * couple marble's 19금 모드. It only darkens the shell itself; the screen
 * inside still brings its own colours.
 */
export default function PhoneFrame({ children, tone = 'light' }) {
  return (
    <div className={`phone${tone === 'dark' ? ' phone--dark' : ''}`}>
      <div className="phone-body">{children}</div>
    </div>
  )
}
