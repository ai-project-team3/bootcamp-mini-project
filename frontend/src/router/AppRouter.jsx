import { Routes, Route, Navigate } from 'react-router-dom'
import StartPage from '../pages/start/StartPage'
import RoomCreatePage from '../pages/roomCreate/RoomCreatePage'
import JoinPage from '../pages/join/JoinPage'
import WaitingRoomPage from '../pages/waiting/WaitingRoomPage'
import GamePage from '../pages/game/GamePage'
import ResultHubPage from '../pages/hub/ResultHubPage'
import PersonalReportPage from '../pages/report/PersonalReportPage'
import TeamReportPage from '../pages/report/TeamReportPage'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<StartPage />} />
      <Route path="/room/create" element={<RoomCreatePage />} />
      <Route path="/join/:code" element={<JoinPage />} />
      <Route path="/room/:code/waiting" element={<WaitingRoomPage />} />
      <Route path="/room/:code/game" element={<GamePage />} />
      <Route path="/room/:code/hub" element={<ResultHubPage />} />
      <Route path="/room/:code/report/me" element={<PersonalReportPage />} />
      <Route path="/room/:code/report/team" element={<TeamReportPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
