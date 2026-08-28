import { useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoomFlowProvider, useRoomFlow } from './RoomFlowContext'

function Seat({ code = 'AB12CD', id = 'p1' }) {
  const { roomCode, playerId, setRoomCode, setPlayerId } = useRoomFlow()
  useEffect(() => {
    setRoomCode(code)
    setPlayerId(id)
  }, [code, id, setPlayerId, setRoomCode])
  return <p>{`${roomCode ?? '-'} / ${playerId ?? '-'}`}</p>
}

function Show() {
  const { roomCode, playerId } = useRoomFlow()
  return <p>{`${roomCode ?? '-'} / ${playerId ?? '-'}`}</p>
}

afterEach(() => {
  window.sessionStorage.clear()
})

describe('staying in the room across a refresh', () => {
  it('remembers who you are, so reloading does not throw you out', () => {
    const first = render(<RoomFlowProvider><Seat /></RoomFlowProvider>)
    first.unmount()

    // A reload is a fresh provider reading the same tab's storage.
    render(<RoomFlowProvider><Show /></RoomFlowProvider>)

    expect(screen.getByText('AB12CD / p1')).toBeInTheDocument()
  })

  it('keeps it per tab, so two players on one machine stay two players', () => {
    render(<RoomFlowProvider><Seat /></RoomFlowProvider>)

    expect(window.sessionStorage.getItem('roomFlow.session')).toContain('AB12CD')
    expect(window.localStorage.getItem('roomFlow.session')).toBeNull()
  })

  it('starts empty when the tab has nothing stored', () => {
    render(<RoomFlowProvider><Show /></RoomFlowProvider>)

    expect(screen.getByText('- / -')).toBeInTheDocument()
  })

  it('survives storage holding something unreadable', () => {
    window.sessionStorage.setItem('roomFlow.session', 'not json')

    render(<RoomFlowProvider><Show /></RoomFlowProvider>)

    expect(screen.getByText('- / -')).toBeInTheDocument()
  })
})
