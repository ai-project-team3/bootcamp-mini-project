import './FlavorToggle.css'

export default function FlavorToggle({ value, onChange }) {
  return (
    <div className="demo-flavor" role="group" aria-label="게임 수위 선택">
      <button className={value === 'mild' ? 'on' : ''} aria-pressed={value === 'mild'} onClick={() => onChange('mild')}>
        🌿 순한맛
      </button>
      <button className={value === 'spicy' ? 'on' : ''} aria-pressed={value === 'spicy'} onClick={() => onChange('spicy')}>
        🌶️ 매운맛
      </button>
    </div>
  )
}
