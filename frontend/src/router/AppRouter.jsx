import { Routes, Route, Navigate } from 'react-router-dom'
import StartPage from '../pages/start/StartPage'
import CategoryPage from '../pages/category/CategoryPage'
import RoomCreatePage from '../pages/roomCreate/RoomCreatePage'
import WaitingRoomPage from '../pages/waiting/WaitingRoomPage'
import SurveyPage from '../pages/survey/SurveyPage'
import StagePage from '../pages/stage/StagePage'
import ReportPage from '../pages/report/ReportPage'
import SharePage from '../pages/share/SharePage'
import GameDemoHubPage from '../pages/gameDemoHub/GameDemoHubPage'
import PersonaImpostorDemoPage from '../pages/personaImpostorDemo/PersonaImpostorDemoPage'
import PersonaPredictionDemoPage from '../pages/personaPredictionDemo/PersonaPredictionDemoPage'
import PartyGamesDemoPage from '../pages/partyGamesDemo/PartyGamesDemoPage'
import AfterDateDemoPage from '../pages/afterDateDemo/AfterDateDemoPage'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<StartPage />} />
      <Route path="/category" element={<CategoryPage />} />
      <Route path="/room/create" element={<RoomCreatePage />} />
      <Route path="/room/:code/waiting" element={<WaitingRoomPage />} />
      <Route path="/room/:code/survey" element={<SurveyPage />} />
      <Route path="/room/:code/stage/:n" element={<StagePage />} />
      <Route path="/room/:code/report" element={<ReportPage />} />
      <Route path="/room/:code/share" element={<SharePage />} />
      <Route path="/games/demo" element={<GameDemoHubPage />} />
      <Route path="/games/demo/persona-impostor" element={<PersonaImpostorDemoPage />} />
      <Route path="/games/demo/persona-prediction" element={<PersonaPredictionDemoPage />} />
      <Route path="/games/demo/party" element={<PartyGamesDemoPage />} />
      <Route path="/after-date/demo" element={<AfterDateDemoPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
