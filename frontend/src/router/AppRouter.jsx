import { Routes, Route, Navigate } from 'react-router-dom'
import StartPage from '../pages/start/StartPage'
import CategoryPage from '../pages/category/CategoryPage'
import RoomCreatePage from '../pages/roomCreate/RoomCreatePage'
import WaitingRoomPage from '../pages/waiting/WaitingRoomPage'
import SurveyPage from '../pages/survey/SurveyPage'
import StagePage from '../pages/stage/StagePage'
import ReportPage from '../pages/report/ReportPage'
import SharePage from '../pages/share/SharePage'

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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
