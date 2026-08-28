import { BrowserRouter } from 'react-router-dom'
import { RoomFlowProvider } from './context/RoomFlowContext'
import AppRouter from './router/AppRouter'

export default function App() {
  return (
    <BrowserRouter>
      <RoomFlowProvider>
        <AppRouter />
      </RoomFlowProvider>
    </BrowserRouter>
  )
}
