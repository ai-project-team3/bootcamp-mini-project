// 기본은 같은 오리진 — vite.config의 프록시가 백엔드로 넘긴다. 그래야 팀원에게
// 주소를 하나만 알려주면 되고, QR 링크와 CORS가 저절로 맞는다.
// 백엔드가 다른 호스트에 있으면 VITE_API_BASE_URL로 덮어쓴다.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const detail = body?.detail
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg ?? JSON.stringify(d)).join(', ')
      : (detail ?? `요청에 실패했습니다 (${res.status})`)
    throw new Error(message)
  }

  return res.json()
}
