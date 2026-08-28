import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GameDemoHubPage from './GameDemoHubPage'
import { GameDemoContext } from '../../context/GameDemoContext'
import { RoomFlowProvider, useRoomFlow } from '../../context/RoomFlowContext'
import * as demoRooms from '../../api/demoRooms'

/** Stands in for the entry screen, which is what puts the player in the room. */
function SeatPlayer({ children }) {
  const { playerId, setPlayerId } = useRoomFlow()
  if (playerId !== 'p1') setPlayerId('p1')
  return children
}

function renderHub({ isHost = true, playerCount = 4 } = {}) {
  const players = Array.from({ length: playerCount }, (_, index) => ({
    id: `p${index + 1}`,
    name: `참가자${index + 1}`,
    isHost: index === 0 ? isHost : false,
  }))
  const value = { room: { code: 'AB12CD' }, players, personas: {} }
  return render(
    <MemoryRouter initialEntries={['/games/demo/room/AB12CD/games']}>
      <RoomFlowProvider>
        <GameDemoContext.Provider value={value}>
          <SeatPlayer>
            <Routes>
              <Route path="/games/demo/room/:code/games" element={<GameDemoHubPage />} />
            </Routes>
          </SeatPlayer>
        </GameDemoContext.Provider>
      </RoomFlowProvider>
    </MemoryRouter>,
  )
}

function cardButton(title) {
  return screen.getByRole('heading', { name: title }).closest('button')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the room chooses a game', () => {
  it('offers the games with their own rooms next to the ones played in this room', () => {
    renderHub()

    expect(screen.getByRole('heading', { name: '마피아' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '커플 브루마블' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '너 누구야?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '라이어게임' })).toBeInTheDocument()
  })

  it('says how many people are waiting, since that is who is coming along', () => {
    renderHub({ playerCount: 5 })

    expect(screen.getByText(/5명이 모여 있어요/)).toBeInTheDocument()
  })

  it('launches a game with its own room for everyone already gathered', async () => {
    const launch = vi.spyOn(demoRooms, 'launchDemoGame').mockResolvedValue({})
    renderHub()

    fireEvent.click(cardButton('마피아'))
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    await waitFor(() => expect(launch).toHaveBeenCalledWith('AB12CD', 'p1', 'mafia'))
  })

  it('selects a game that plays inside this room the way it always did', async () => {
    const select = vi.spyOn(demoRooms, 'selectDemoGame').mockResolvedValue({})
    renderHub()

    fireEvent.click(cardButton('라이어게임'))
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    await waitFor(() => expect(select).toHaveBeenCalledWith('AB12CD', 'p1', 'liar'))
  })

  it('explains on the card when the group is the wrong size for a game', () => {
    renderHub({ playerCount: 3 })

    expect(cardButton('마피아')).toBeDisabled()
    expect(screen.getByText('4명부터 시작할 수 있어요')).toBeInTheDocument()
    expect(cardButton('커플 브루마블')).not.toBeDisabled()
  })

  it('lets only the host pick', () => {
    renderHub({ isHost: false })

    expect(cardButton('마피아')).toBeDisabled()
    expect(cardButton('라이어게임')).toBeDisabled()
    expect(screen.getByText('방장이 게임을 선택하면 모두 함께 이동해요.')).toBeInTheDocument()
  })

  it('shows the failure instead of pretending the game started', async () => {
    vi.spyOn(demoRooms, 'launchDemoGame').mockRejectedValue(new Error('마피아는 4, 5, 6, 7, 8명일 때만 시작할 수 있어요'))
    renderHub()

    fireEvent.click(cardButton('마피아'))
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('마피아는 4, 5, 6, 7, 8명일 때만')
  })
})
