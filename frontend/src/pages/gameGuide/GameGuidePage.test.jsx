import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GameGuidePage from './GameGuidePage'
import { GameDemoContext } from '../../context/GameDemoContext'
import { GameRoomProvider, useGameRoom } from '../../context/GameRoomContext'
import * as demoRooms from '../../api/demoRooms'

function SeatPlayer({ children }) {
  const { playerId, setPlayerId } = useGameRoom()
  useEffect(() => {
    setPlayerId('p1')
  }, [setPlayerId])
  return playerId ? children : null
}

function renderGuide(gameId, { isHost = true, playerCount = 4 } = {}) {
  const players = Array.from({ length: playerCount }, (_, index) => ({
    id: `p${index + 1}`,
    name: `참가자${index + 1}`,
    isHost: index === 0 ? isHost : false,
  }))
  const value = { room: { code: 'AB12CD' }, players, personas: {} }
  return render(
    <MemoryRouter initialEntries={[`/games/demo/room/AB12CD/guide/${gameId}`]}>
      <GameRoomProvider>
        <GameDemoContext.Provider value={value}>
          <SeatPlayer>
            <Routes>
              <Route path="/games/demo/room/:code/guide/:gameId" element={<GameGuidePage />} />
              <Route path="/games/demo/room/:code/games" element={<p>게임 목록</p>} />
            </Routes>
          </SeatPlayer>
        </GameDemoContext.Provider>
      </GameRoomProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  window.sessionStorage.clear()
})

describe('the rules, before any game starts', () => {
  it('has them for 마피아 too, which used to start with none', () => {
    renderGuide('mafia')

    expect(screen.getByText(/밤마다 사람이 사라지는/)).toBeInTheDocument()
    expect(screen.getByText(/마피아 1명, 의사 1명, 경찰 1명/)).toBeInTheDocument()
  })

  it('has them for 커플 브루마블 too', () => {
    renderGuide('marble')

    expect(screen.getByText(/보드를 한 바퀴 돌면서/)).toBeInTheDocument()
  })

  it('asks 커플 브루마블 which mode to play, since its own lobby is skipped', async () => {
    const launch = vi.spyOn(demoRooms, 'launchDemoGame').mockResolvedValue({})
    renderGuide('marble', { playerCount: 3 })

    fireEvent.click(screen.getByTestId('pm-mode-adult'))
    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }))

    await waitFor(() => expect(launch).toHaveBeenCalledWith('AB12CD', 'p1', 'marble', {
      content_mode: 'adult',
    }))
  })

  it('plays 일반 모드 unless the host says otherwise', async () => {
    const launch = vi.spyOn(demoRooms, 'launchDemoGame').mockResolvedValue({})
    renderGuide('marble', { playerCount: 3 })

    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }))

    await waitFor(() => expect(launch).toHaveBeenCalledWith('AB12CD', 'p1', 'marble', {
      content_mode: 'general',
    }))
  })

  it('offers no mode for a game that has none', () => {
    renderGuide('mafia')

    expect(screen.queryByTestId('pm-mode-adult')).toBeNull()
  })

  it('launches a game that runs its own room', async () => {
    const launch = vi.spyOn(demoRooms, 'launchDemoGame').mockResolvedValue({})
    renderGuide('mafia')

    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }))

    await waitFor(() => expect(launch).toHaveBeenCalledWith('AB12CD', 'p1', 'mafia', {}))
  })

  it('starts a game played inside this room the way it always did', async () => {
    const start = vi.spyOn(demoRooms, 'startSelectedDemoGame').mockResolvedValue({})
    renderGuide('liar')

    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }))

    await waitFor(() => expect(start).toHaveBeenCalledWith('AB12CD', 'p1'))
  })

  it('will not start a game the group is the wrong size for', () => {
    renderGuide('mafia', { playerCount: 3 })

    expect(screen.getByRole('button', { name: '4명부터 시작할 수 있어요' })).toBeDisabled()
  })

  it('leaves starting to the host', () => {
    renderGuide('mafia', { isHost: false })

    expect(screen.getByText('방장이 게임 시작하기를 기다리고 있어요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '게임 시작' })).toBeNull()
  })

  it('goes back to the game list without breaking up the room', async () => {
    const back = vi.spyOn(demoRooms, 'returnToRoomHub').mockResolvedValue({})
    renderGuide('mafia')

    fireEvent.click(screen.getByRole('button', { name: '게임 목록' }))

    await waitFor(() => expect(back).toHaveBeenCalledWith('AB12CD', 'p1'))
    expect(await screen.findByText('게임 목록')).toBeInTheDocument()
  })
})
