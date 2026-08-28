import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { DEMO_GAME_CATALOG } from '../../data/gameDemo/gameDemoData'
import { selectDemoGame } from '../../api/demoRooms'
import Button from '../../components/common/Button'
import { useGameDemo } from '../../context/GameDemoContext'
import { useRoomFlow } from '../../context/RoomFlowContext'
import './GameDemoHubPage.css'

export default function GameDemoHubPage() {
  const navigate = useNavigate()
  const { code: roomCode = '' } = useParams()
  const { players } = useGameDemo()
  const { playerId } = useRoomFlow()
  const [openGroups, setOpenGroups] = useState({ 'Persona Games': true, 'Party Games': true })
  const [pendingGame, setPendingGame] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const [error, setError] = useState('')
  const me = players.find((player) => player.id === playerId)
  const toggleGroup = (group) => setOpenGroups((current) => ({ ...current, [group]: !current[group] }))
  const confirmGame = async () => {
    if (!pendingGame) return
    setSelecting(true)
    setError('')
    try {
      await selectDemoGame(roomCode, playerId, pendingGame.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSelecting(false)
    }
  }

  return (
    <PhoneFrame>
      <TopBar
        title={roomCode ? `게임 선택 · ${roomCode}` : '게임 데모'}
        showBack={Boolean(roomCode)}
        onBack={roomCode ? () => navigate('/games/demo') : undefined}
      />
      <header className="demo-hub-head">
        <span>ROOM GAMES</span>
        <h1>게임만 바로<br />테스트해보세요</h1>
        <p>{roomCode ? '방 입장과 시작만 공유되며, 게임 진행은 현재 기기별 데모입니다.' : '게임별 전체 플레이 흐름을 로컬에서 확인합니다.'}</p>
      </header>
      {['Persona Games', 'Party Games'].map((group) => (
        <section key={group} className="demo-hub-group">
          <button className="demo-hub-group-toggle" onClick={() => toggleGroup(group)} aria-expanded={openGroups[group]}>
            <span>{group}</span><b>{openGroups[group] ? '−' : '+'}</b>
          </button>
          {openGroups[group] && (
            <div className="demo-hub-list">
              {DEMO_GAME_CATALOG.filter((game) => game.group === group).map((game) => (
                <button
                  key={game.path}
                  className="demo-hub-button"
                  onClick={() => me?.isHost && setPendingGame(game)}
                  disabled={!me?.isHost}
                >
                  <Card className="demo-hub-card">
                    <div className="demo-hub-card-top"><span>{game.emoji}</span><Badge tone="fun">PLAY</Badge></div>
                    <h2>{game.title}</h2><p>{game.desc}</p><b>시작하기 →</b>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </section>
      ))}
      {!me?.isHost && <p className="demo-hub-wait">방장이 게임을 선택하면 모두 같은 설명서로 이동해요.</p>}
      {pendingGame && (
        <div className="demo-game-confirm-backdrop" role="presentation">
          <Card className="demo-game-confirm" role="dialog" aria-modal="true" aria-labelledby="game-confirm-title">
            <span>{pendingGame.emoji}</span>
            <h2 id="game-confirm-title">{pendingGame.title} 게임으로<br />시작할까요?</h2>
            <p>확인하면 모든 참가자가 게임 설명서로 함께 이동해요.</p>
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
