const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

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
