import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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

function pathFor(game, from) {
  if (isRoomFree(game.id)) return `/games/party/${game.id}`
  // 얼음땡에서 넘어왔다면 그 방 코드를 계속 들고 간다 — 여기서 끊기면 성향이
  // 따라오지 않는다.
  return from ? `/games/demo?from=${from}` : '/games/demo'
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
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from')
  const [openGroups, setOpenGroups] = useState({ 'Persona Games': true, 'Party Games': false })
  const toggleGroup = (group) => setOpenGroups((current) => ({ ...current, [group]: !current[group] }))

  return (
    <PhoneFrame>
      <TopBar title="게임 목록" onBack={() => navigate(from ? `/room/${from}/hub` : '/')} />
      <header className="demo-hub-head">
        <span>ALL GAMES</span>
        <h1>어떤 게임이<br />있는지 볼까요?</h1>
        <p>
          {from
            ? '얼음땡에서 나온 성향으로 이어서 해요. 하나 고르면 방을 만들어 다시 모입니다.'
            : '여럿이 하는 게임은 방을 먼저 만들고, 모인 다음에 골라요.'}
        </p>
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
                    onClick={() => navigate(pathFor(game, from))}
                  >
                    <Card className="demo-hub-card">
                      {/* 배지는 뺐다. 카드 아래 "방 만들고 시작 →"이 같은 말을
                          이미 하고 있는데, 좁은 카드 위에 알약을 하나 더 얹으면
                          그게 제일 크게 보인다. */}
                      <div className="demo-hub-card-top">
                        <span>{game.emoji}</span>
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
