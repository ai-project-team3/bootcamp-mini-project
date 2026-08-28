import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { MafiaApp } from '../mafia/MafiaApp'
import '../mafia/styles/global.css'
import './MinigamePage.css'

/**
 * The mafia game inside the app's phone shell.
 *
 * The shell and the top bar come from the app so navigation feels the same
 * everywhere; the game keeps its own night palette inside, which is why the
 * frame is asked for its dark tone.
 */
export default function MafiaGamePage() {
  const navigate = useNavigate()

  return (
    <PhoneFrame tone="dark">
      <TopBar title="마피아" onBack={() => navigate('/')} />
      <div className="minigame-slot">
        <MafiaApp />
      </div>
    </PhoneFrame>
  )
}
