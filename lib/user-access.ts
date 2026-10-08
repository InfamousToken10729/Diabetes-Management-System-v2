import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export function hashSecret(value: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(value, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifySecret(value: string, stored: string | null | undefined) {
  if (!stored) return false
  const [salt, expected] = stored.split(':')
  if (!salt || !expected) return false
  const actual = scryptSync(value, salt, 64)
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'))
}

export function hashRecoveryPhrase(value: string) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export function makeUserId() {
  return `user_${randomBytes(12).toString('hex')}`
}

export function avatarColor(index: number) {
  return ['cyan', 'violet', 'amber', 'emerald', 'rose', 'blue'][index % 6]
}
