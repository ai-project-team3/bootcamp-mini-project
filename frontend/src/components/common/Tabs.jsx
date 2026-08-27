import './Tabs.css'

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="ptabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`ptab ${active === tab.id ? 'ptab-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
