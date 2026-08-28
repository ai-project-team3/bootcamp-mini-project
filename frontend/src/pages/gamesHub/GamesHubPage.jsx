import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { DEMO_GAME_CATALOG } from '../../data/gameDemo/gameDemoData'
import { STANDALONE_GAMES } from '../../data/gamesHub/standaloneGames'
import '../gameDemoHub/GameDemoHubPage.css'

const GROUPS = [
  { key: 'Persona Games', label: '페르소나 게임' },
  { key: 'Party Games', label: '파티 게임' },
]

/**
 * Every game in one list, grouped and collapsible.
 *
 * Two kinds of game live here and they start differently, so the card says
 * which: a `standalone` game runs its own room and opens straight away, while
 * the rest are played in a shared demo room, so their cards lead to the demo
 * entry where the host makes a room and then picks for everyone.
 *
 * The layout reuses the demo hub's stylesheet so both lists look the same.
 */
export default function GamesHubPage() {
  const navigate = useNavigate()
  const [openGroups, setOpenGroups] = useState({ 'Persona Games': true, 'Party Games': false })
  const toggleGroup = (group) => setOpenGroups((current) => ({ ...current, [group]: !current[group] }))
  const allGames = [...STANDALONE_GAMES, ...DEMO_GAME_CATALOG]

  return (
    <PhoneFrame>
      <TopBar title="게임 선택" onBack={() => navigate('/')} />
      <header className="demo-hub-head">
        <span>ALL GAMES</span>
        <h1>어떤 게임을<br />해볼까요?</h1>
        <p>카테고리를 눌러 펼치고 접을 수 있어요.</p>
      </header>
      {GROUPS.map(({ key, label }) => {
        const games = allGames.filter((game) => game.group === key)
        return (
          <section key={key} className="demo-hub-group">
            <button
              type="button"
              className="demo-hub-group-toggle"
              onClick={() => toggleGroup(key)}
              aria-expanded={openGroups[key]}
            >
              <span>{label} ({games.length})</span>
              <b>{openGroups[key] ? '−' : '+'}</b>
            </button>
            {openGroups[key] && (
              <div className="demo-hub-list">
                {games.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    className="demo-hub-button"
                    onClick={() => navigate(game.standalone ? game.path : '/games/demo')}
                  >
                    <Card className="demo-hub-card">
                      <div className="demo-hub-card-top">
                        <span>{game.emoji}</span>
                        <Badge tone={game.standalone ? 'positive' : 'fun'}>
                          {game.standalone ? 'PLAY' : 'ROOM'}
                        </Badge>
                      </div>
                      <h2>{game.title}</h2>
                      <p>{game.desc}</p>
                      <b>{game.standalone ? '바로 시작 →' : '방 만들기 →'}</b>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </PhoneFrame>
  )
}
