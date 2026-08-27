const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(length = 6) {
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}
