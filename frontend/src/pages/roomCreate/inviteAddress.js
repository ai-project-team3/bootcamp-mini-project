// 폰이 QR을 찍고 실제로 닿을 수 있는 주소를 고른다.
//
// 브라우저는 자기가 접속한 주소밖에 모른다. 방을 만든 사람이 localhost로 열었다면
// 그 주소를 그대로 QR에 담게 되는데, 그걸 찍은 폰에서 localhost는 **폰 자신**이라
// 아무 데도 닿지 않는다. 방을 만든 쪽에서는 멀쩡히 보이고 찍는 쪽만 실패하니
// 원인을 찾기도 어렵다. 그래서 주소창이 localhost일 때만 서버에게 물어본 랜
// 주소로 갈아끼운다. 터널(cloudflared·ngrok) 도메인이나 랜 IP로 열었다면 그건
// 이미 밖에서 닿는 주소이므로 손대지 않는다.

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1', ''])

/** 주소창의 주소가 이 기기 밖에서는 쓸모없는 주소인가. */
export function isLoopback(hostname) {
  return LOOPBACK.has(hostname) || hostname.endsWith('.localhost')
}

/**
 * QR과 초대 링크에 담을 주소.
 * @param location `window.location` 모양의 것
 * @param lanHost 서버가 알려준 랜 주소. 아직 못 받았거나 못 찾았으면 null
 */
export function inviteOrigin(location, lanHost) {
  if (!isLoopback(location.hostname) || !lanHost) return location.origin
  return `${location.protocol}//${lanHost}${location.port ? `:${location.port}` : ''}`
}

export function inviteUrl(location, lanHost, roomCode) {
  return `${inviteOrigin(location, lanHost)}/join/${roomCode}`
}
