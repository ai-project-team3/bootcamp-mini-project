import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExitToGamesControl from '../../components/common/ExitToGamesControl'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { useGameRoom } from '../../context/GameRoomContext'
import { getDemoHubPath } from '../../data/gameDemo/gameDemoModels'
import { MarbleApp } from '../marble/MarbleApp'
import { hasMarbleSession, resetMarbleGame } from '../marble/resetGame'
import '../marble/styles/global.css'
import './MinigamePage.css'

/**
 * Couple marble inside the app's phone shell.
 *
 * The game runs light in 일반 모드 and dark in 19금 모드, so the shell follows
 * whichever mode the room is in. The game reports that through `onToneChange`
 * rather than the shell reaching into the game's state.
 *
 * Leaving — from the top bar, the waiting room's 나가기, or the final score —
 * runs the same teardown: the marble room is released and the session cleared.
 * A group that came from a shared room lands back on that room's game list,
 * still together; a player who came in alone lands on room creation.
 */
export default function MarbleGamePage() {
  const navigate = useNavigate()
  const { roomCode } = useGameRoom()
  const [tone, setTone] = useState('light')
  const exitPath = getDemoHubPath(roomCode)

  // The host ended the game. Everyone else goes back to the room they came
  // from, still gathered, rather than being left on marble's own lobby.
  const handleRoomClosed = useCallback(() => {
    if (roomCode) navigate(exitPath, { replace: true })
  }, [exitPath, navigate, roomCode])

  const exitToGames = async () => {
    await resetMarbleGame()
    navigate(exitPath, { replace: true })
  }

  return (
    <PhoneFrame tone={tone}>
      <TopBar
        title="커플 브루마블"
        showBack={false}
        right={
          <ExitToGamesControl
            label={roomCode ? '게임 고르기' : '게임 목록'}
            onLeave={resetMarbleGame}
            to={exitPath}
            shouldConfirm={hasMarbleSession}
            description={
              roomCode
                ? '진행 중인 브루마블 게임은 여기서 끝나요. 방은 그대로 남아 있어서, 모여 있는 사람들과 다른 게임을 이어서 고를 수 있어요.'
                : '진행 중인 게임은 여기서 끝나요. 방도 없어지니 다시 하려면 방을 새로 만들고 사람들을 처음부터 다시 초대해야 해요.'
            }
            confirmLabel="게임 끝내고 나가기"
          />
        }
      />
      <div className="minigame-slot">
        <MarbleApp onToneChange={setTone} onExit={exitToGames} onRoomClosed={handleRoomClosed} />
      </div>
    </PhoneFrame>
  )
}
