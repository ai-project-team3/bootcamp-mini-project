import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ExitToGamesControl from '../../components/common/ExitToGamesControl'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getDemoHubPath } from '../../data/gameDemo/gameDemoModels'
import { MafiaApp } from '../mafia/MafiaApp'
import { hasMafiaSession, resetMafiaGame } from '../mafia/resetGame'
import '../mafia/styles/global.css'
import './MinigamePage.css'

/**
 * The mafia game inside the app's phone shell.
 *
 * The shell and the top bar come from the app so navigation feels the same
 * everywhere; the game keeps its own night palette inside, which is why the
 * frame is asked for its dark tone.
 *
 * Leaving always tears this game down — the mafia room is released and its
 * session dropped, so nothing of the abandoned game survives. Where it lands
 * depends on how the game was entered: a group that came from a shared room
 * goes back to that room's game list, still together and free to pick
 * something else, while a player who came in alone returns to the game list.
 */
export default function MafiaGamePage() {
  const navigate = useNavigate()
  const { roomCode } = useRoomFlow()

  // The host ended the game. Everyone else goes back to the room they came
  // from, still gathered, rather than being left on mafia's own entry screen.
  const handleRoomClosed = useCallback(() => {
    if (roomCode) navigate(getDemoHubPath(roomCode), { replace: true })
  }, [navigate, roomCode])

  return (
    <PhoneFrame tone="dark">
      <TopBar
        title="마피아"
        showBack={false}
        action={
          <ExitToGamesControl
            label={roomCode ? '게임 고르기' : '게임 목록'}
            onLeave={resetMafiaGame}
            to={getDemoHubPath(roomCode)}
            shouldConfirm={hasMafiaSession}
            description={
              roomCode
                ? '진행 중인 마피아 게임은 여기서 끝나요. 방은 그대로 남아 있어서, 모여 있는 사람들과 다른 게임을 이어서 고를 수 있어요.'
                : '진행 중인 게임은 여기서 끝나요. 방도 없어지니 다시 하려면 방을 새로 만들고 사람들을 처음부터 다시 초대해야 해요.'
            }
            confirmLabel="게임 끝내고 나가기"
          />
        }
      />
      <div className="minigame-slot">
        <MafiaApp onRoomClosed={handleRoomClosed} />
      </div>
    </PhoneFrame>
  )
}
