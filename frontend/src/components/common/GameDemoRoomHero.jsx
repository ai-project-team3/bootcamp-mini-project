import './GameDemoRoomHero.css'

export default function GameDemoRoomHero({ eyebrow, title, children, compact = false }) {
  return (
    <header className={`game-room-hero${compact ? ' compact' : ''}`}>
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  )
}
