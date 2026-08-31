import { afterEach, describe, expect, it, vi } from 'vitest'
import { shareCurrentPage } from './share'

const URL_ = 'http://192.168.0.27:5173/room/ABCDEF/report'

function at(href) {
  // jsdom의 location은 못 바꾸니 통째로 갈아끼운다.
  delete window.location
  window.location = new URL(href)
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete navigator.share
  delete navigator.clipboard
  document.execCommand = undefined
})

describe('shareCurrentPage', () => {
  it('공유 시트가 있으면 그걸 쓴다', async () => {
    at(URL_)
    navigator.share = vi.fn().mockResolvedValue(undefined)
    expect(await shareCurrentPage('제목', '본문')).toBe('shared')
    expect(navigator.share).toHaveBeenCalledWith({
      title: '제목', text: '본문', url: URL_,
    })
  })

  it('사용자가 공유 시트를 닫으면 실패가 아니다', async () => {
    at(URL_)
    const abort = Object.assign(new Error('x'), { name: 'AbortError' })
    navigator.share = vi.fn().mockRejectedValue(abort)
    expect(await shareCurrentPage('제목', '본문')).toBe('cancelled')
  })

  it('공유 시트가 없으면 클립보드로 넘어간다', async () => {
    at(URL_)
    const writeText = vi.fn().mockResolvedValue(undefined)
    navigator.clipboard = { writeText }
    expect(await shareCurrentPage('제목', '본문')).toBe('copied')
    // 링크만 담으면 받는 사람이 무슨 링크인지 모른다.
    expect(writeText).toHaveBeenCalledWith(`본문\n${URL_}`)
  })

  // 이게 팀원들이 겪은 경우다. 평문 HTTP라 navigator.share도 clipboard도 없어서
  // 곧장 '공유에 실패했어요'가 떴다.
  it('평문 HTTP — 두 API가 다 없어도 복사된다', async () => {
    at(URL_)
    const exec = vi.fn().mockReturnValue(true)
    document.execCommand = exec
    expect(navigator.share).toBeUndefined()
    expect(navigator.clipboard).toBeUndefined()
    expect(await shareCurrentPage('제목', '본문')).toBe('copied')
    expect(exec).toHaveBeenCalledWith('copy')
  })

  it('클립보드 권한이 거부돼도 옛 방법으로 다시 시도한다', async () => {
    at(URL_)
    navigator.clipboard = { writeText: vi.fn().mockRejectedValue(new Error('denied')) }
    document.execCommand = vi.fn().mockReturnValue(true)
    expect(await shareCurrentPage('제목', '본문')).toBe('copied')
  })

  it('정말로 복사가 안 되면 실패로 알린다', async () => {
    at(URL_)
    document.execCommand = vi.fn().mockReturnValue(false)
    expect(await shareCurrentPage('제목', '본문')).toBe('failed')
  })

  it('복사용 textarea를 남기지 않는다', async () => {
    at(URL_)
    document.execCommand = vi.fn().mockReturnValue(true)
    await shareCurrentPage('제목', '본문')
    expect(document.querySelectorAll('textarea')).toHaveLength(0)
  })
})
