import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { isRoomFree } from '../../data/gamesHub/standaloneGames'
import { ROOM_GAME_GROUPS, roomGamesInGroup } from '../../data/gamesHub/roomGameCatalog'
import '../gameDemoHub/GameDemoHubPage.css'

/** A game needs a room unless it is playable by passing one phone around. */
function needsRoom(game) {
  return !isRoomFree(game.id)
}

function pathFor(game) {
  return isRoomFree(game.id) ? `/games/party/${game.id}` : '/games/demo'
}

/**
 * What there is to play, before anyone has a room.
 *
 * Every game that needs a screen each — 마피아 and 커플 브루마블 included —
 * leads to the same place: making or joining a room. The game itself is chosen
 * later, from inside the room, once everyone has arrived. There is deliberately
 * no second way into a game from here: two entrances to 마피아, one making its
 * own room and one using the shared one, is exactly the confusion this screen
 * used to cause.
 *
 * Room-free party games are played by passing one phone, so those still open
 * straight away.
 *
 * The layout reuses the room chooser's stylesheet so both lists look the same.
 */
export default function GamesHubPage() {
  const navigate = useNavigate()
  const [openGroups, setOpenGroups] = useState({ 'Persona Games': true, 'Party Games': false })
  const toggleGroup = (group) => setOpenGroups((current) => ({ ...current, [group]: !current[group] }))

  return (
    <PhoneFrame>
      <TopBar title="게임 목록" onBack={() => navigate('/')} />
      <header className="demo-hub-head">
        <span>ALL GAMES</span>
        <h1>어떤 게임이<br />있는지 볼까요?</h1>
        <p>여럿이 하는 게임은 방을 먼저 만들고, 모인 다음에 골라요.</p>
      </header>
      {ROOM_GAME_GROUPS.map(({ key, label }) => {
        const games = roomGamesInGroup(key)
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
                      <b>{needsRoom(game) ? '방 만들고 시작 →' : '바로 시작 →'}</b>
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
