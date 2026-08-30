import { Navigate, useSearchParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import BackToRoomGamesControl from '../../components/common/BackToRoomGamesControl'
import { useGameDemo } from '../../context/GameDemoContext'
import { PARTY_CATALOG } from '../../data/gameDemo/gameDemoData'
import { getDemoHubPath, resolvePartyGameId } from '../../data/gameDemo/gameDemoModels'
import CategoryMarketGame from './games/CategoryMarketGame'
import CharadesGame from './games/CharadesGame'
import ForbiddenWordGame from './games/ForbiddenWordGame'
import LiarGame from './games/LiarGame'
import NameChainGame from './games/NameChainGame'
import TelepathyGame from './games/TelepathyGame'
import './PartyGamesDemoPage.css'

const GAME_COMPONENTS = {
  'name-chain': NameChainGame,
  'category-market': CategoryMarketGame,
  liar: LiarGame,
  charades: CharadesGame,
  'forbidden-word': ForbiddenWordGame,
  telepathy: TelepathyGame,
}

export default function PartyGamesDemoPage() {
  const { players } = useGameDemo()
  const [searchParams] = useSearchParams()
  const selectedId = resolvePartyGameId(searchParams.get('game'), PARTY_CATALOG)
  const hubPath = getDemoHubPath(searchParams.get('room'))
  const SelectedGame = selectedId ? GAME_COMPONENTS[selectedId] : null

  if (!SelectedGame) return <Navigate to={hubPath} replace />

  return <PhoneFrame><TopBar title="Party Games" showBack={false} right={<BackToRoomGamesControl />} /><SelectedGame players={players} /></PhoneFrame>
}
