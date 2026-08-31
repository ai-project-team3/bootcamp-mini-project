import { describe, expect, it } from 'vitest'
import { inviteOrigin, inviteUrl, isLoopback } from './inviteAddress'

const at = (href) => new URL(href)

describe('inviteOrigin', () => {
  it('localhost로 열었으면 서버가 알려준 랜 주소로 갈아끼운다', () => {
    expect(inviteOrigin(at('http://localhost:5173/room'), '192.168.0.27')).toBe(
      'http://192.168.0.27:5173',
    )
  })

  it('127.0.0.1도 마찬가지다', () => {
    expect(inviteOrigin(at('http://127.0.0.1:5173/'), '192.168.0.27')).toBe('http://192.168.0.27:5173')
  })

  // 여기를 건드리면 터널로 부른 팀원이 전부 못 들어온다. 터널 도메인은 이미
  // 밖에서 닿는 주소고, 랜 IP로 바꾸면 오히려 인터넷 너머에서는 닿지 않는다.
  it('터널 도메인은 그대로 둔다', () => {
    const url = at('https://icy-forest-1234.trycloudflare.com/room')
    expect(inviteOrigin(url, '192.168.0.27')).toBe('https://icy-forest-1234.trycloudflare.com')
  })

  it('이미 랜 IP로 열었으면 그대로 둔다', () => {
    expect(inviteOrigin(at('http://192.168.0.27:5173/'), '10.0.0.5')).toBe('http://192.168.0.27:5173')
  })

  // 랜에 안 붙어 있으면 서버도 알려줄 주소가 없다. 그때는 주소창 주소를 쓰고
  // 화면이 경고를 대신 띄운다 — 조용히 깨진 QR을 주는 것보다 낫다.
  it('랜 주소를 못 받았으면 주소창 주소를 쓴다', () => {
    expect(inviteOrigin(at('http://localhost:5173/'), null)).toBe('http://localhost:5173')
  })

  it('포트가 없으면 붙이지 않는다', () => {
    expect(inviteOrigin(at('http://localhost/'), '192.168.0.27')).toBe('http://192.168.0.27')
  })
})

describe('isLoopback', () => {
  it.each(['localhost', '127.0.0.1', '::1', 'app.localhost'])('%s는 이 기기 안에서만 쓸 수 있다', (h) => {
    expect(isLoopback(h)).toBe(true)
  })

  it.each(['192.168.0.27', 'icy-forest.trycloudflare.com'])('%s는 밖에서도 닿는다', (h) => {
    expect(isLoopback(h)).toBe(false)
  })
})

describe('inviteUrl', () => {
  it('방 코드를 붙인 전체 링크를 만든다', () => {
    expect(inviteUrl(at('http://localhost:5173/'), '192.168.0.27', 'KWJMWN')).toBe(
      'http://192.168.0.27:5173/join/KWJMWN',
    )
  })
})
