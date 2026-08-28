import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { DEMO_GAME_CATALOG } from '../../data/gameDemo/gameDemoData'
import { STANDALONE_GAMES, isRoomFree } from '../../data/gamesHub/standaloneGames'
import '../gameDemoHub/GameDemoHubPage.css'

/** A game needs a room unless it runs its own, or is playable on one phone. */
function needsRoom(game) {
  return !game.standalone && !isRoomFree(game.id)
}

function pathFor(game) {
  if (game.standalone) return game.path
  if (isRoomFree(game.id)) return `/games/party/${game.id}`
  return '/games/demo'
}

const GROUPS = [
  { key: 'Persona Games', label: '페르소나 게임' },
  { key: 'Party Games', label: '파티 게임' },
]

/**
 * Every game in one list, grouped and collapsible.
 *
 * Games start in one of three ways, and the card says which:
 * - `standalone` (마피아, 커플 브루마블) run their own rooms and open directly.
 * - Room-free party games are played by passing one phone, so they open directly too.
 * - Everything else needs a screen each, so its card leads to the demo entry
 *   where the host makes a room and then picks the game for everyone.
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
                    onClick={() => navigate(pathFor(game))}
                  >
                    <Card className="demo-hub-card">
                      <div className="demo-hub-card-top">
                        <span>{game.emoji}</span>
                        <Badge tone={needsRoom(game) ? 'fun' : 'positive'}>
                          {needsRoom(game) ? 'ROOM' : 'PLAY'}
                        </Badge>
                      </div>
                      <h2>{game.title}</h2>
                      <p>{game.desc}</p>
                      <b>{needsRoom(game) ? '방 만들기 →' : '바로 시작 →'}</b>
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
