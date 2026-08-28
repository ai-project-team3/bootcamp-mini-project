import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import BackToRoomGamesControl from '../../components/common/BackToRoomGamesControl'
import ContentModeChoice from '../../components/room/ContentModeChoice'
import { ROOM_GAME_CATALOG } from '../../data/gamesHub/roomGameCatalog'
import { playerCountBlocker } from '../../data/gamesHub/standaloneGames'
import { GAME_GUIDES } from '../../data/gameDemo/gameGuideData'
import { getDemoHubPath } from '../../data/gameDemo/gameDemoModels'
import { launchDemoGame, startSelectedDemoGame } from '../../api/demoRooms'
import { useGameDemo } from '../../context/GameDemoContext'
import { useRoomFlow } from '../../context/RoomFlowContext'
import './GameGuidePage.css'

/**
 * The rules, shown to everyone before a game starts.
 *
 * Every game passes through here, including 마피아 and 커플 브루마블 — they
 * used to drop the room straight into play, which meant the two games with the
 * most rules were the two nobody was told the rules of.
 *
 * It is also where a game asks for anything its own entry screen would have:
 * 커플 브루마블's 일반/19금 mode is chosen here, since a group launched from
 * the room never sees that game's lobby.
 */
export default function GameGuidePage() {
  const { code, gameId } = useParams()
  const { players } = useGameDemo()
  const { playerId } = useRoomFlow()
  const [starting, setStarting] = useState(false)
  const [contentMode, setContentMode] = useState('general')
  const [error, setError] = useState('')
  const guide = GAME_GUIDES[gameId]
  const game = ROOM_GAME_CATALOG.find((item) => item.id === gameId)
  const hubPath = getDemoHubPath(code)

  if (!guide || !game) return <Navigate to={hubPath} replace />

  const isHost = players.find((player) => player.id === playerId)?.isHost
  const blocker = playerCountBlocker(game, players.length)
  const startGame = async () => {
    setStarting(true)
    setError('')
    try {
      if (game.standalone) {
        // Builds this game's own room around everyone here; the guard walks
        // them in from wherever they are.
        await launchDemoGame(code, playerId, gameId, {
          ...(gameId === 'marble' ? { content_mode: contentMode } : {}),
        })
      } else {
        await startSelectedDemoGame(code, playerId)
      }
    } catch (err) {
      setError(err.message)
      setStarting(false)
    }
  }

  return (
    <PhoneFrame>
      <TopBar title={`${guide.emoji} ${guide.title}`} showBack={false} action={<BackToRoomGamesControl />} />
      <header className="game-guide-head">
        <Badge tone="fun">게임 설명서</Badge>
        <h1>{guide.goal}</h1>
        <p>{guide.players} · {guide.duration}</p>
      </header>
      <Card>
        <h2>이렇게 플레이해요</h2>
        <ol className="game-guide-steps">
          {guide.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </Card>
      <Card>
        <h2>꼭 지켜주세요</h2>
        <ul className="game-guide-rules">
          {guide.rules.map((rule) => <li key={rule}>{rule}</li>)}
        </ul>
        <p className="game-guide-tip">TIP · {guide.tip}</p>
      </Card>
      {isHost && gameId === 'marble' && (
        <Card>
          <h2>모드를 골라주세요</h2>
          <ContentModeChoice value={contentMode} onChange={setContentMode} label={null} />
        </Card>
      )}
      {error && <p className="game-room-error" role="alert">{error}</p>}
      {isHost ? (
        <Button onClick={startGame} disabled={starting || Boolean(blocker)}>
          {starting ? '시작하는 중...' : blocker ?? '게임 시작'}
        </Button>
      ) : (
        <Button variant="ghost" disabled>방장이 게임 시작하기를 기다리고 있어요</Button>
      )}
    </PhoneFrame>
  )
}
