import { useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GameRoomProvider, useGameRoom } from './GameRoomContext'

function Seat({ code = 'AB12CD', id = 'p1' }) {
  const { roomCode, playerId, setRoomCode, setPlayerId } = useGameRoom()
  useEffect(() => {
    setRoomCode(code)
    setPlayerId(id)
  }, [code, id, setPlayerId, setRoomCode])
  return <p>{`${roomCode ?? '-'} / ${playerId ?? '-'}`}</p>
}

function Show() {
  const { roomCode, playerId } = useGameRoom()
  return <p>{`${roomCode ?? '-'} / ${playerId ?? '-'}`}</p>
}

afterEach(() => {
  window.sessionStorage.clear()
})

describe('staying in the room across a refresh', () => {
  it('remembers who you are, so reloading does not throw you out', () => {
    const first = render(<GameRoomProvider><Seat /></GameRoomProvider>)
    first.unmount()

    // A reload is a fresh provider reading the same tab's storage.
    render(<GameRoomProvider><Show /></GameRoomProvider>)

    expect(screen.getByText('AB12CD / p1')).toBeInTheDocument()
  })

  it('keeps it per tab, so two players on one machine stay two players', () => {
    render(<GameRoomProvider><Seat /></GameRoomProvider>)

    expect(window.sessionStorage.getItem('gameRoom.session')).toContain('AB12CD')
    expect(window.localStorage.getItem('gameRoom.session')).toBeNull()
  })

  it('starts empty when the tab has nothing stored', () => {
    render(<GameRoomProvider><Show /></GameRoomProvider>)

    expect(screen.getByText('- / -')).toBeInTheDocument()
  })

  it('survives storage holding something unreadable', () => {
    window.sessionStorage.setItem('gameRoom.session', 'not json')

    render(<GameRoomProvider><Show /></GameRoomProvider>)

    expect(screen.getByText('- / -')).toBeInTheDocument()
  })
})
