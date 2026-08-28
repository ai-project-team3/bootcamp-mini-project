import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExitToGamesControl from '../../components/common/ExitToGamesControl'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
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
 * runs the same teardown: the room is released and the session cleared, so the
 * next game starts from an empty room with a fresh invite.
 */
export default function MarbleGamePage() {
  const navigate = useNavigate()
  const [tone, setTone] = useState('light')

  const exitToGames = async () => {
    await resetMarbleGame()
    navigate('/games', { replace: true })
  }

  return (
    <PhoneFrame tone={tone}>
      <TopBar
        title="커플 브루마블"
        showBack={false}
        action={
          <ExitToGamesControl
            onLeave={resetMarbleGame}
            shouldConfirm={hasMarbleSession}
            description="진행 중인 게임은 여기서 끝나요. 방도 없어지니 다시 하려면 방을 새로 만들고 사람들을 처음부터 다시 초대해야 해요."
            confirmLabel="게임 끝내고 나가기"
          />
        }
      />
      <div className="minigame-slot">
        <MarbleApp onToneChange={setTone} onExit={exitToGames} />
      </div>
    </PhoneFrame>
  )
}
