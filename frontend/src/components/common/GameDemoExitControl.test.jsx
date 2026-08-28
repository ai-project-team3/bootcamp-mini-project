import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GameDemoExitControl from './GameDemoExitControl'
import { GameDemoContext } from '../../context/GameDemoContext'
import { RoomFlowProvider, useRoomFlow } from '../../context/RoomFlowContext'
import * as demoRooms from '../../api/demoRooms'

/** Stands in for the entry screen, which is what puts the player in the room. */
function SeatPlayer({ children }) {
  const { playerId, setPlayerId } = useRoomFlow()
  if (playerId !== 'p1') setPlayerId('p1')
  return children
}

function renderExit({ isHost = true } = {}) {
  const value = {
    room: { code: 'AB12CD' },
    players: [{ id: 'p1', nickname: '민우', isHost }],
  }
  return render(
    <MemoryRouter initialEntries={['/games/demo/room/AB12CD/games']}>
      <RoomFlowProvider>
        <GameDemoContext.Provider value={value}>
          <SeatPlayer>
          <Routes>
            <Route path="/games/demo/room/:code/games" element={<GameDemoExitControl />} />
            <Route path="/games/demo" element={<p>방 만들기 화면</p>} />
          </Routes>
          </SeatPlayer>
        </GameDemoContext.Provider>
      </RoomFlowProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GameDemoExitControl', () => {
  it('leaves the demo room and returns to room creation', async () => {
    const leave = vi.spyOn(demoRooms, 'leaveDemoRoom').mockResolvedValue({})
    renderExit()

    fireEvent.click(screen.getByRole('button', { name: '게임 목록' }))
    fireEvent.click(screen.getByRole('button', { name: '방 종료하고 나가기' }))

    await waitFor(() => expect(leave).toHaveBeenCalledWith('AB12CD', 'p1'))
    expect(await screen.findByText('방 만들기 화면')).toBeInTheDocument()
  })

  it('warns the host that leaving ends the room for everyone', () => {
    renderExit({ isHost: true })
    fireEvent.click(screen.getByRole('button', { name: '게임 목록' }))
    expect(screen.getByText(/방장이 나가면 이 방은 종료되고/)).toBeInTheDocument()
  })

  it('tells a guest that the others keep playing', () => {
    renderExit({ isHost: false })
    fireEvent.click(screen.getByRole('button', { name: '게임 목록' }))
    expect(screen.getByText(/다른 참가자의 게임은 계속돼요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '나가기' })).toBeInTheDocument()
  })
})
