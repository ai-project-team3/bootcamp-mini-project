import { api, ApiError } from './client'

const KEY = 'user_id'

// Private-mode Safari and locked-down browsers throw on localStorage access
// rather than returning null, so every touch is guarded. Losing the id means
// starting over as a new person, which is the documented behaviour (plan §4-4).
function read() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function write(value) {
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // Nothing to do — the session still works, it just will not survive a reload.
  }
}

function clear() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Ignored for the same reason as above.
  }
}

// Shared across callers so a second call while the first is still in flight
// waits on it instead of minting another account. Without this, StrictMode's
// double mount alone issues two ids on every page load and orphans one.
let inflight = null

/**
 * Returns the stored profile, issuing a fresh anonymous account when there is
 * no usable id. Plan doc §4-1. This is the only place a user_id is created.
 */
export function ensureUser() {
  if (!inflight) {
    inflight = resolveUser().catch((err) => {
      inflight = null // let the next attempt retry rather than reusing the failure
      throw err
    })
  }
  return inflight
}

async function resolveUser() {
  const stored = read()
  if (stored) {
    try {
      return await api.get(`/users/${stored}`)
    } catch (err) {
      // 404 means the server no longer knows this id (wiped dev database, or a
      // stale id from another environment). Anything else is a real outage and
      // should surface rather than silently minting a second account.
      if (!(err instanceof ApiError) || err.status !== 404) throw err
      clear()
    }
  }

  const created = await api.post('/users')
  write(created.user_id)
  return created
}

export function getStoredUserId() {
  return read()
}

export function saveProfile(userId, { nickname, gender }) {
  return api.patch(`/users/${userId}`, { nickname, gender })
}
