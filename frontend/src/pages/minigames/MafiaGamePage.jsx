import ExitToGamesControl from '../../components/common/ExitToGamesControl'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
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
 * Leaving goes through the app's exit control — the only way out, so that
 * quitting mid-game always releases the room and clears the session instead of
 * dropping the player back into the game they just walked out of.
 */
export default function MafiaGamePage() {
  return (
    <PhoneFrame tone="dark">
      <TopBar
        title="마피아"
        showBack={false}
        action={
          <ExitToGamesControl
            onLeave={resetMafiaGame}
            shouldConfirm={hasMafiaSession}
            description="진행 중인 게임은 여기서 끝나요. 방도 없어지니 다시 하려면 방을 새로 만들고 사람들을 처음부터 다시 초대해야 해요."
            confirmLabel="게임 끝내고 나가기"
          />
        }
      />
      <div className="minigame-slot">
        <MafiaApp />
      </div>
    </PhoneFrame>
  )
}
