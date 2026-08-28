import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { leaveDemoRoom } from '../../api/demoRooms'
import { useGameDemo } from '../../context/GameDemoContext'
import { useRoomFlow } from '../../context/RoomFlowContext'
import Button from './Button'
import Card from './Card'
import './GameDemoExitControl.css'

export default function GameDemoExitControl() {
  const navigate = useNavigate()
  const { room, players } = useGameDemo()
  const { playerId, setRoomCode, setPlayerId, setIsHost } = useRoomFlow()
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  const isHost = players.find((player) => player.id === playerId)?.isHost

  const leave = async () => {
    setLeaving(true)
    setError('')
    try {
      await leaveDemoRoom(room.code, playerId)
      setRoomCode(null)
      setPlayerId(null)
      setIsHost(true)
      navigate('/games/demo', { replace: true })
    } catch (err) {
      setError(err.message)
      setLeaving(false)
    }
  }

  return (
    <>
      <button className="demo-exit-trigger" type="button" onClick={() => setOpen(true)}>종료</button>
      {open && (
        <div className="demo-exit-backdrop" role="presentation">
          <Card className="demo-exit-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-dialog-title">
            <h2 id="exit-dialog-title">정말 종료할까요?</h2>
            <p>{isHost ? '방장이 나가면 이 방은 종료되고 모든 참가자가 나가게 돼요.' : '나만 방에서 나가고, 다른 참가자의 게임은 계속돼요.'}</p>
            {error && <p className="game-room-error" role="alert">{error}</p>}
            <div className="demo-exit-actions">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={leaving}>취소</Button>
              <Button onClick={leave} disabled={leaving}>{leaving ? '나가는 중...' : isHost ? '방 종료' : '나가기'}</Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
