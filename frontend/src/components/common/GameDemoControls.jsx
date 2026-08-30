import './GameDemoControls.css'

export function DemoPlayerTabs({ players, activeId, onChange, label = '현재 플레이어' }) {
  return (
    <div className="game-demo-player-tabs" role="tablist" aria-label={label}>
      {players.map((player) => (
        <button
          key={player.id}
          aria-selected={activeId === player.id}
          className={activeId === player.id ? 'on' : ''}
          onClick={() => onChange(player.id)}
        >
          {player.emoji} {player.name}
        </button>
      ))}
    </div>
  )
}

export function DemoOptionList({ options, selectedIndex, disabled = false, onSelect }) {
  return (
    <div className="game-demo-options">
      {options.map((option, index) => (
        <button
          key={option}
          className={selectedIndex === index ? 'on' : ''}
          disabled={disabled}
          onClick={() => onSelect(index)}
        >
          <b>{index + 1}</b>{option}
        </button>
      ))}
    </div>
  )
}

export function DemoNotice({ children }) {
  return <p className="game-demo-notice">{children}</p>
}

export function DemoActionRow({ children, balanced = false }) {
  return <div className={balanced ? 'game-demo-actions balanced' : 'game-demo-actions'}>{children}</div>
}
