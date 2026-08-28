import { useNavigate } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { DEMO_GAME_CATALOG } from '../../data/gameDemo/gameDemoData'
import { STANDALONE_GAMES } from '../../data/gamesHub/standaloneGames'
import './GamesHubPage.css'

/**
 * The one place every game is listed.
 *
 * Two kinds of game live in this app and they start differently, so the screen
 * says which is which instead of pretending they are the same:
 *
 * - Standalone games (마피아, 커플 브루마블) run their own rooms, so a card
 *   goes straight into the game.
 * - The persona and party demos are played inside a shared demo room, so their
 *   cards lead to the demo entry where a room is made or joined first — the
 *   host then picks the game for everyone.
 */
export default function GamesHubPage() {
  const navigate = useNavigate()
  const personaDemos = DEMO_GAME_CATALOG.filter((game) => game.group === 'Persona Games')
  const partyDemos = DEMO_GAME_CATALOG.filter((game) => game.group === 'Party Games')

  return (
    <PhoneFrame>
      <TopBar title="게임 선택" onBack={() => navigate('/')} />
      <div className="games-hub">
        <header className="games-hub-head">
          <span>ALL GAMES</span>
          <h1>어떤 게임을<br />해볼까요?</h1>
        </header>

        <section className="games-hub-group">
          <h2 className="games-hub-group-title">
            바로 플레이 <small>각자 방을 만들어 시작합니다</small>
          </h2>
          <div className="games-hub-list">
            {STANDALONE_GAMES.map((game) => (
              <button
                key={game.id}
                type="button"
                className="games-hub-button"
                onClick={() => navigate(game.path)}
              >
                <Card className="games-hub-card">
                  <div className="games-hub-card-top">
                    <span className="games-hub-emoji">{game.emoji}</span>
                    <Badge tone="positive">PLAY</Badge>
                  </div>
                  <h3>{game.title}</h3>
                  <p>{game.desc}</p>
                  <b>{game.players} · 시작하기 →</b>
                </Card>
              </button>
            ))}
          </div>
        </section>

        {[
          { title: '페르소나 게임', games: personaDemos },
          { title: '파티 게임', games: partyDemos },
        ].map(({ title, games }) => (
          <section key={title} className="games-hub-group">
            <h2 className="games-hub-group-title">
              {title} <small>방을 만들어 다 함께 합니다</small>
            </h2>
            <div className="games-hub-list">
              {games.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  className="games-hub-button"
                  onClick={() => navigate('/games/demo')}
                >
                  <Card className="games-hub-card">
                    <div className="games-hub-card-top">
                      <span className="games-hub-emoji">{game.emoji}</span>
                      <Badge tone="fun">ROOM</Badge>
                    </div>
                    <h3>{game.title}</h3>
                    <p>{game.desc}</p>
                    <b>방 만들기 →</b>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PhoneFrame>
  )
}
