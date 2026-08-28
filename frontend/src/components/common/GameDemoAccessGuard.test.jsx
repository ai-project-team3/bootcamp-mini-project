import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GameDemoAccessGuard from './GameDemoAccessGuard'
import { RoomFlowProvider, useRoomFlow } from '../../context/RoomFlowContext'
import * as demoRooms from '../../api/demoRooms'
import { readMafiaSession } from '../../pages/mafia/hooks/usePlayerSession'

/** Stands in for the entry screen, which is what puts the player in the room.
 *  The guard sends anyone without a seat back to room creation, so nothing is
 *  rendered until this one is seated. */
function SeatPlayer({ children }) {
  const { playerId, setPlayerId, setRoomCode } = useRoomFlow()
  useEffect(() => {
    setPlayerId('p1')
    setRoomCode('AB12CD')
  }, [setPlayerId, setRoomCode])
  return playerId ? children : null
}

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/games/demo/room/AB12CD/games']}>
      <RoomFlowProvider>
        <SeatPlayer>
          <Routes>
            <Route
              path="/games/demo/room/:code/games"
              element={<GameDemoAccessGuard><p>게임 고르기 화면</p></GameDemoAccessGuard>}
            />
            <Route path="/games/mafia" element={<p>마피아 게임</p>} />
            <Route path="/games/demo" element={<p>방 만들기 화면</p>} />
          </Routes>
        </SeatPlayer>
      </RoomFlowProvider>
    </MemoryRouter>,
  )
}

function room(launch) {
  return {
    code: 'AB12CD',
    status: 'IN_PROGRESS',
    player_count: 4,
    max_players: 10,
    selected_game_id: launch ? launch.game_id : null,
    game_phase: launch ? 'LAUNCHED' : 'HUB',
    launch: launch ?? null,
  }
}

const PLAYERS = [
  { id: 'p1', nickname: '방장', seat_no: 1, is_host: true },
  { id: 'p2', nickname: '둘', seat_no: 2, is_host: false },
]

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('a game the host launched for the whole room', () => {
  it('carries this player in holding their own id, without asking for anything', async () => {
    vi.spyOn(demoRooms, 'getDemoRoom').mockResolvedValue(room({ game_id: 'mafia', room_id: 'ROOM01' }))
    vi.spyOn(demoRooms, 'getDemoPlayers').mockResolvedValue(PLAYERS)
    vi.spyOn(demoRooms, 'claimLaunchedGame').mockResolvedValue({
      game_id: 'mafia',
      room_id: 'ROOM01',
      player_id: 'mafia-p1',
      is_host: true,
    })

    renderGuard()

    expect(await screen.findByText('마피아 게임')).toBeInTheDocument()
    expect(demoRooms.claimLaunchedGame).toHaveBeenCalledWith('AB12CD', 'p1')
    expect(readMafiaSession()).toEqual({ roomId: 'ROOM01', playerId: 'mafia-p1', isHost: true })
  })

  it('leaves the room list alone while no game has been launched', async () => {
    vi.spyOn(demoRooms, 'getDemoRoom').mockResolvedValue(room(null))
    vi.spyOn(demoRooms, 'getDemoPlayers').mockResolvedValue(PLAYERS)
    const claim = vi.spyOn(demoRooms, 'claimLaunchedGame').mockResolvedValue({})

    renderGuard()

    expect(await screen.findByText('게임 고르기 화면')).toBeInTheDocument()
    expect(claim).not.toHaveBeenCalled()
  })

  it('does not drag a player back into a game they already quit', async () => {
    window.sessionStorage.setItem('roomGameLaunch.followed', 'ROOM01')
    vi.spyOn(demoRooms, 'getDemoRoom').mockResolvedValue(room({ game_id: 'mafia', room_id: 'ROOM01' }))
    vi.spyOn(demoRooms, 'getDemoPlayers').mockResolvedValue(PLAYERS)
    const claim = vi.spyOn(demoRooms, 'claimLaunchedGame').mockResolvedValue({})

    renderGuard()

    expect(await screen.findByText('게임 고르기 화면')).toBeInTheDocument()
    expect(claim).not.toHaveBeenCalled()
  })

  it('keeps a player who cannot claim a seat on the room list', async () => {
    vi.spyOn(demoRooms, 'getDemoRoom').mockResolvedValue(room({ game_id: 'mafia', room_id: 'ROOM01' }))
    vi.spyOn(demoRooms, 'getDemoPlayers').mockResolvedValue(PLAYERS)
    vi.spyOn(demoRooms, 'claimLaunchedGame').mockRejectedValue(new Error('게임이 시작된 뒤에 들어온 참가자입니다'))

    renderGuard()

    expect(await screen.findByText('게임 고르기 화면')).toBeInTheDocument()
    await waitFor(() => expect(readMafiaSession()).toBeNull())
  })
})
