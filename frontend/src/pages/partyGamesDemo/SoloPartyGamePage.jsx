import { Navigate, useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { DEMO_PLAYERS, PARTY_CATALOG } from '../../data/gameDemo/gameDemoData'
import { isRoomFree } from '../../data/gamesHub/standaloneGames'
import CategoryMarketGame from './games/CategoryMarketGame'
import CharadesGame from './games/CharadesGame'
import NameChainGame from './games/NameChainGame'
import TelepathyGame from './games/TelepathyGame'
import './PartyGamesDemoPage.css'
import './SoloPartyGamePage.css'

const GAME_COMPONENTS = {
  'name-chain': NameChainGame,
  'category-market': CategoryMarketGame,
  charades: CharadesGame,
  telepathy: TelepathyGame,
}

/**
 * A party game played on one phone, with no room to gather first.
 *
 * The four games routed here need nothing from the server — three of them do
 * not even look at the player list, and 통했나? runs off the built-in demo
 * roster. The games that do need a screen each still go through the demo room.
 */
export default function SoloPartyGamePage() {
  const { gameId = '' } = useParams()
  const navigate = useNavigate()
  const SelectedGame = isRoomFree(gameId) ? GAME_COMPONENTS[gameId] : null
  if (!SelectedGame) return <Navigate to="/games" replace />

  const meta = PARTY_CATALOG.find((game) => game.id === gameId)

  return (
    <PhoneFrame>
      <TopBar
        title={meta ? `${meta.emoji} ${meta.title}` : 'Party Game'}
        onBack={() => navigate('/games')}
        right={
          <Button variant="ghost" className="solo-party-exit" onClick={() => navigate('/games')}>
            게임 목록
          </Button>
        }
      />
      <SelectedGame players={DEMO_PLAYERS} />
    </PhoneFrame>
  )
}
