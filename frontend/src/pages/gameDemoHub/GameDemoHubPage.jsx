import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { DEMO_GAME_CATALOG } from '../../data/gameDemo/gameDemoData'
import './GameDemoHubPage.css'

export default function GameDemoHubPage() {
  const navigate = useNavigate()
  const [openGroups, setOpenGroups] = useState({ 'Persona Games': true, 'Party Games': true })
  const toggleGroup = (group) => setOpenGroups((current) => ({ ...current, [group]: !current[group] }))

  return (
    <PhoneFrame>
      <TopBar title="게임 데모" showBack={false} />
      <header className="demo-hub-head">
        <span>LOCAL INTERACTIVE DEMO</span>
        <h1>게임만 바로<br />테스트해요.</h1>
        <p>닉네임, 방, 설문, 리포트 없이 8개 게임 흐름만 확인합니다.</p>
      </header>
      {['Persona Games', 'Party Games'].map((group) => <section key={group} className="demo-hub-group">
        <button className="demo-hub-group-toggle" onClick={() => toggleGroup(group)} aria-expanded={openGroups[group]}>
          <span>{group}</span><b>{openGroups[group] ? '−' : '+'}</b>
        </button>
        {openGroups[group] && <div className="demo-hub-list">
        {DEMO_GAME_CATALOG.filter((game) => game.group === group).map((game) => (
          <button key={game.path} className="demo-hub-button" onClick={() => navigate(game.path)}>
            <Card className="demo-hub-card">
              <div className="demo-hub-card-top"><span>{game.emoji}</span><Badge tone="fun">PLAY</Badge></div>
              <h2>{game.title}</h2><p>{game.desc}</p><b>시작하기 →</b>
            </Card>
          </button>
        ))}
        </div>}
      </section>)}
    </PhoneFrame>
  )
}
