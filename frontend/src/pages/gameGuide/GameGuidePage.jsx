import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import GameDemoExitControl from '../../components/common/GameDemoExitControl'
import { DEMO_GAME_CATALOG } from '../../data/gameDemo/gameDemoData'
import { GAME_GUIDES } from '../../data/gameDemo/gameGuideData'
import { getDemoHubPath } from '../../data/gameDemo/gameDemoModels'
import { startSelectedDemoGame } from '../../api/demoRooms'
import { useGameDemo } from '../../context/GameDemoContext'
import { useRoomFlow } from '../../context/RoomFlowContext'
import './GameGuidePage.css'

export default function GameGuidePage() {
  const { code, gameId } = useParams()
  const { players } = useGameDemo()
  const { playerId } = useRoomFlow()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const guide = GAME_GUIDES[gameId]
  const game = DEMO_GAME_CATALOG.find((item) => item.id === gameId)
  const hubPath = getDemoHubPath(code)

  if (!guide || !game) return <Navigate to={hubPath} replace />

  const isHost = players.find((player) => player.id === playerId)?.isHost
  const startGame = async () => {
    setStarting(true)
    setError('')
    try {
      await startSelectedDemoGame(code, playerId)
    } catch (err) {
      setError(err.message)
      setStarting(false)
    }
  }

  return (
    <PhoneFrame>
      <TopBar title={`${guide.emoji} ${guide.title}`} showBack={false} action={<GameDemoExitControl />} />
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
      {error && <p className="game-room-error" role="alert">{error}</p>}
      {isHost ? (
        <Button onClick={startGame} disabled={starting}>{starting ? '시작하는 중...' : '게임 시작'}</Button>
      ) : (
        <Button variant="ghost" disabled>방장이 게임 시작하기를 기다리고 있어요</Button>
      )}
    </PhoneFrame>
  )
}
