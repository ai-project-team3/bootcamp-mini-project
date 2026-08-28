import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import GameDemoExitControl from '../../components/common/GameDemoExitControl'
import Card from '../../components/common/Card'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { launchDemoGame, selectDemoGame } from '../../api/demoRooms'
import Button from '../../components/common/Button'
import { useGameDemo } from '../../context/GameDemoContext'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { ROOM_GAME_GROUPS, roomGamesInGroup } from '../../data/gamesHub/roomGameCatalog'
import { playerCountBlocker } from '../../data/gamesHub/standaloneGames'
import './GameDemoHubPage.css'

/**
 * The room's game chooser — the only place a game is picked.
 *
 * Everyone is already gathered by the time this screen appears, so choosing a
 * game never asks for a nickname or an invite code again. Two kinds of game
 * live in the same list and start differently:
 * - games that play inside this room are *selected*, which moves everyone to
 *   the shared guide screen;
 * - 마피아 and 커플 브루마블 keep rooms of their own, so they are *launched*:
 *   the server builds their room around this roster and each player is sent in
 *   holding their own id (see `components/common/GameDemoAccessGuard`).
 */
export default function GameDemoHubPage() {
  const { code: roomCode = '' } = useParams()
  const { players } = useGameDemo()
  const { playerId } = useRoomFlow()
  const [openGroups, setOpenGroups] = useState({ 'Persona Games': true, 'Party Games': true })
  const [pendingGame, setPendingGame] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const [error, setError] = useState('')
  const me = players.find((player) => player.id === playerId)
  const isHost = Boolean(me?.isHost)
  const toggleGroup = (group) => setOpenGroups((current) => ({ ...current, [group]: !current[group] }))

  const confirmGame = async () => {
    if (!pendingGame) return
    setSelecting(true)
    setError('')
    try {
      if (pendingGame.standalone) {
        // The guard is watching the room and will take everyone in, this
        // player included, as soon as the launch lands.
        await launchDemoGame(roomCode, playerId, pendingGame.id)
      } else {
        await selectDemoGame(roomCode, playerId, pendingGame.id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSelecting(false)
    }
  }

  return (
    <PhoneFrame>
      <TopBar
        title={roomCode ? `게임 고르기 · ${roomCode}` : '게임 목록'}
        showBack={false}
        action={<GameDemoExitControl />}
      />
      <header className="demo-hub-head">
        <span>ROOM GAMES</span>
        <h1>어떤 게임을<br />해볼까요?</h1>
        <p>{`${players.length}명이 모여 있어요. 방장이 고르면 다 같이 그대로 이동해요.`}</p>
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
                {games.map((game) => {
                  const blocker = playerCountBlocker(game, players.length)
                  return (
                    <button
                      key={game.id}
                      type="button"
                      className="demo-hub-button"
                      onClick={() => setPendingGame(game)}
                      disabled={!isHost || Boolean(blocker)}
                    >
                      <Card className="demo-hub-card">
                        <div className="demo-hub-card-top">
                          <span>{game.emoji}</span>
                          <Badge tone={blocker ? 'neutral' : 'fun'}>{blocker ? '인원' : 'PLAY'}</Badge>
                        </div>
                        <h2>{game.title}</h2>
                        <p>{game.desc}</p>
                        <b>{blocker ?? '시작하기 →'}</b>
                      </Card>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
      {!isHost && <p className="demo-hub-wait">방장이 게임을 선택하면 모두 함께 이동해요.</p>}
      {pendingGame && (
        <div className="demo-game-confirm-backdrop" role="presentation">
          <Card className="demo-game-confirm" role="dialog" aria-modal="true" aria-labelledby="game-confirm-title">
            <span>{pendingGame.emoji}</span>
            <h2 id="game-confirm-title">{pendingGame.title} 게임으로<br />시작할까요?</h2>
            <p>{`지금 모여 있는 ${players.length}명 그대로 함께 이동해요.`}</p>
            {error && <p className="game-room-error" role="alert">{error}</p>}
            <div className="demo-game-confirm-actions">
              <Button variant="secondary" onClick={() => setPendingGame(null)} disabled={selecting}>취소</Button>
              <Button onClick={confirmGame} disabled={selecting}>{selecting ? '이동 중...' : '확인'}</Button>
            </div>
          </Card>
        </div>
      )}
    </PhoneFrame>
  )
}
