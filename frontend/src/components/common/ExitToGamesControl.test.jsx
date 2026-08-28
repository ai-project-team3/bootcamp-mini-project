import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ExitToGamesControl from './ExitToGamesControl'

function renderControl(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/games/mafia']}>
      <Routes>
        <Route
          path="/games/mafia"
          element={<ExitToGamesControl description="진행 중인 게임은 여기서 끝나요." {...props} />}
        />
        <Route path="/games" element={<p>게임 목록 화면</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ExitToGamesControl', () => {
  it('asks before ending a running game', async () => {
    const onLeave = vi.fn().mockResolvedValue(undefined)
    renderControl({ onLeave, shouldConfirm: () => true })

    fireEvent.click(screen.getByRole('button', { name: '게임 목록' }))

    expect(screen.getByText('게임을 끝내고 나갈까요?')).toBeInTheDocument()
    expect(onLeave).not.toHaveBeenCalled()
  })

  it('tears the game down and lands on the game list once confirmed', async () => {
    const onLeave = vi.fn().mockResolvedValue(undefined)
    renderControl({ onLeave, shouldConfirm: () => true })

    fireEvent.click(screen.getByRole('button', { name: '게임 목록' }))
    fireEvent.click(screen.getByRole('button', { name: '나가기' }))

    await waitFor(() => expect(onLeave).toHaveBeenCalled())
    expect(await screen.findByText('게임 목록 화면')).toBeInTheDocument()
  })

  it('stays put when the player cancels', () => {
    const onLeave = vi.fn()
    renderControl({ onLeave, shouldConfirm: () => true })

    fireEvent.click(screen.getByRole('button', { name: '게임 목록' }))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.queryByText('게임을 끝내고 나갈까요?')).not.toBeInTheDocument()
    expect(onLeave).not.toHaveBeenCalled()
  })

  it('leaves straight away when no game is running', async () => {
    // On the room-creation screen there is nothing to end, so a dialog about
    // ending a game would be nonsense.
    const onLeave = vi.fn().mockResolvedValue(undefined)
    renderControl({ onLeave, shouldConfirm: () => false })

    fireEvent.click(screen.getByRole('button', { name: '게임 목록' }))

    expect(await screen.findByText('게임 목록 화면')).toBeInTheDocument()
    expect(screen.queryByText('게임을 끝내고 나갈까요?')).not.toBeInTheDocument()
  })

  it('keeps the player in the game and shows why when leaving fails', async () => {
    const onLeave = vi.fn().mockRejectedValue(new Error('방을 나가지 못했어요'))
    renderControl({ onLeave, shouldConfirm: () => true })

    fireEvent.click(screen.getByRole('button', { name: '게임 목록' }))
    fireEvent.click(screen.getByRole('button', { name: '나가기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('방을 나가지 못했어요')
    expect(screen.queryByText('게임 목록 화면')).not.toBeInTheDocument()
  })
})
