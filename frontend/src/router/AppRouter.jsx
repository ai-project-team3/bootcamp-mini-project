import { Routes, Route, Navigate } from 'react-router-dom'
import StartPage from '../pages/start/StartPage'
import RoomCreatePage from '../pages/roomCreate/RoomCreatePage'
import JoinPage from '../pages/join/JoinPage'
import WaitingRoomPage from '../pages/waiting/WaitingRoomPage'
import GameDemoAccessGuard from '../components/common/GameDemoAccessGuard'
import GameDemoHubPage from '../pages/gameDemoHub/GameDemoHubPage'
import GameDemoEntryPage from '../pages/gameDemoEntry/GameDemoEntryPage'
import GameDemoRoomPage from '../pages/gameDemoRoom/GameDemoRoomPage'
import GameGuidePage from '../pages/gameGuide/GameGuidePage'
import PersonaImpostorDemoPage from '../pages/personaImpostorDemo/PersonaImpostorDemoPage'
import PersonaPredictionDemoPage from '../pages/personaPredictionDemo/PersonaPredictionDemoPage'
import PartyGamesDemoPage from '../pages/partyGamesDemo/PartyGamesDemoPage'
import AfterDateDemoPage from '../pages/afterDateDemo/AfterDateDemoPage'
import GamePage from '../pages/game/GamePage'
import StatementsPage from '../pages/statements/StatementsPage'
import ResultHubPage from '../pages/hub/ResultHubPage'
import PersonalReportPage from '../pages/report/PersonalReportPage'
import TeamReportPage from '../pages/report/TeamReportPage'
import GamesHubPage from '../pages/gamesHub/GamesHubPage'
import MafiaGamePage from '../pages/minigames/MafiaGamePage'
import MarbleGamePage from '../pages/minigames/MarbleGamePage'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<StartPage />} />
      <Route path="/room/create" element={<RoomCreatePage />} />
      <Route path="/join/:code" element={<JoinPage />} />
      <Route path="/room/:code/waiting" element={<WaitingRoomPage />} />
      <Route path="/room/:code/game" element={<GamePage />} />
      <Route path="/room/:code/statements" element={<StatementsPage />} />
      <Route path="/room/:code/hub" element={<ResultHubPage />} />
      <Route path="/room/:code/report/me" element={<PersonalReportPage />} />
      <Route path="/room/:code/report/team" element={<TeamReportPage />} />
      <Route path="/games/demo" element={<GameDemoEntryPage />} />
      <Route path="/games/demo/join/:code" element={<GameDemoEntryPage />} />
      <Route path="/games/demo/room/:code" element={<GameDemoRoomPage />} />
      <Route path="/games/demo/room/:code/games" element={<GameDemoAccessGuard><GameDemoHubPage /></GameDemoAccessGuard>} />
      <Route path="/games/demo/room/:code/guide/:gameId" element={<GameDemoAccessGuard><GameGuidePage /></GameDemoAccessGuard>} />
      <Route path="/games/demo/persona-impostor" element={<GameDemoAccessGuard><PersonaImpostorDemoPage /></GameDemoAccessGuard>} />
      <Route path="/games/demo/persona-prediction" element={<GameDemoAccessGuard><PersonaPredictionDemoPage /></GameDemoAccessGuard>} />
      <Route path="/games/demo/party" element={<GameDemoAccessGuard><PartyGamesDemoPage /></GameDemoAccessGuard>} />
      <Route path="/after-date/demo" element={<AfterDateDemoPage />} />
      {/* 모든 게임을 한 곳에서 고르는 화면. 데모룸 게임은 여기서 /games/demo 로,
          자체 방을 쓰는 미니게임은 바로 아래 두 경로로 들어간다. */}
      <Route path="/games" element={<GamesHubPage />} />
      <Route path="/games/mafia" element={<MafiaGamePage />} />
      <Route path="/games/marble" element={<MarbleGamePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
