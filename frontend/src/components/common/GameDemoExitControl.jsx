import { leaveDemoRoom } from '../../api/demoRooms'
import { useGameDemo } from '../../context/GameDemoContext'
import { useRoomFlow } from '../../context/RoomFlowContext'
import ExitToGamesControl from './ExitToGamesControl'

/** The party games' way out: leave the demo room, then back to room creation. */
export default function GameDemoExitControl() {
  const { room, players } = useGameDemo()
  const { playerId, setRoomCode, setPlayerId, setIsHost } = useRoomFlow()
  const isHost = players.find((player) => player.id === playerId)?.isHost

  const leave = async () => {
    await leaveDemoRoom(room.code, playerId)
    setRoomCode(null)
    setPlayerId(null)
    setIsHost(true)
  }

  return (
    <ExitToGamesControl
      onLeave={leave}
      to="/games/demo"
      confirmLabel={isHost ? '방 종료하고 나가기' : '나가기'}
      description={`진행 중인 게임은 여기서 끝나고, 방을 새로 만드는 화면으로 돌아가요. ${
        isHost
          ? '방장이 나가면 이 방은 종료되고 모든 참가자가 나가게 돼요.'
          : '나만 방에서 나가고, 다른 참가자의 게임은 계속돼요.'
      }`}
    />
  )
}
