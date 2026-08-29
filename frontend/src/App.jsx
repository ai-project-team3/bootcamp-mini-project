import { BrowserRouter } from 'react-router-dom'
import { GameRoomProvider } from './context/GameRoomContext'
import { RoomFlowProvider } from './context/RoomFlowContext'
import AppRouter from './router/AppRouter'

export default function App() {
  return (
    <BrowserRouter>
      <RoomFlowProvider>
        {/* 얼음땡은 RoomFlowProvider, 그 뒤 게임들은 GameRoomProvider —
            게임 쪽은 탭마다 다른 사람이어야 해서 저장 범위가 다르다. */}
        <GameRoomProvider>
          <AppRouter />
        </GameRoomProvider>
      </RoomFlowProvider>
    </BrowserRouter>
  )
}
