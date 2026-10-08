'use server'

import { and, asc, eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { deviceUsers } from '@/lib/db/schema'
import { getDeviceId } from '@/lib/device'
import { avatarColor, hashRecoveryPhrase, hashSecret, makeUserId, verifySecret } from '@/lib/user-access'

const ACTIVE_USER = 'glycoguide-active-user-v2'
const SIGNED_OUT = 'glycoguide-signed-out-v2'
const COOKIE_OPTIONS = { httpOnly: true, sameSite: 'lax' as const, secure: false, path: '/', maxAge: 60 * 60 * 24 * 30 }

export async function listDeviceUsers() {
  const deviceId = await getDeviceId()
  return db.select().from(deviceUsers).where(and(eq(deviceUsers.deviceId, deviceId), eq(deviceUsers.isMain, true))).orderBy(asc(deviceUsers.createdAt))
}

export async function createDeviceUser(displayName: string, password?: string, recoveryPhrase?: string) {
  const deviceId = await getDeviceId()
  const name = displayName.trim().slice(0, 40)
  if (!name) throw new Error('Enter a user name')
  const existing = await listDeviceUsers()
  const isMain = existing.length === 0
  if (isMain && (!password || password.length < 8 || !recoveryPhrase?.trim())) throw new Error('The first user needs a password and recovery phrase')
  const id = makeUserId()
  await db.insert(deviceUsers).values({ id, deviceId, displayName: name, avatarColor: avatarColor(existing.length), isMain, passwordHash: isMain ? hashSecret(password!) : null, recoveryPhraseHash: isMain ? hashRecoveryPhrase(recoveryPhrase!) : null })
  const jar = await cookies()
  jar.set(SIGNED_OUT, '', { ...COOKIE_OPTIONS, maxAge: 0 })
  jar.set(ACTIVE_USER, id, COOKIE_OPTIONS)
  return id
}

export async function selectDeviceUser(id: string) {
  const deviceId = await getDeviceId()
  const [user] = await db.select({ id: deviceUsers.id }).from(deviceUsers).where(and(eq(deviceUsers.id, id), eq(deviceUsers.deviceId, deviceId))).limit(1)
  if (!user) throw new Error('User not found')
  const jar = await cookies()
  jar.set(SIGNED_OUT, '', { ...COOKIE_OPTIONS, maxAge: 0 })
  jar.set(ACTIVE_USER, user.id, COOKIE_OPTIONS)
}

export async function getActiveDeviceUser() {
  const deviceId = await getDeviceId()
  if ((await cookies()).get(SIGNED_OUT)?.value === '1') return null
  const [main] = await db.select().from(deviceUsers).where(and(eq(deviceUsers.deviceId, deviceId), eq(deviceUsers.isMain, true))).limit(1)
  return main ?? null
}

export async function isDeviceSignedOut() {
  return (await cookies()).get(SIGNED_OUT)?.value === '1'
}

export async function loginMainAccount(password: string) {
  const users = await listDeviceUsers()
  const main = users.find((user) => user.isMain)
  if (!main || !verifySecret(password, main.passwordHash)) throw new Error('Incorrect main account password')
  await selectDeviceUser(main.id)
}

export async function verifyMainPassword(password: string) {
  const users = await listDeviceUsers()
  const main = users.find((user) => user.isMain)
  return !!main && verifySecret(password, main.passwordHash)
}

export async function changeMainPassword(oldPassword: string, newPassword: string) {
  const users = await listDeviceUsers()
  const main = users.find((user) => user.isMain)
  if (!main || !verifySecret(oldPassword, main.passwordHash)) throw new Error('The old password is incorrect')
  if (newPassword.length < 8) throw new Error('The new password must be at least 8 characters')
  const { db } = await import('@/lib/db')
  await db.update(deviceUsers).set({ passwordHash: hashSecret(newPassword), updatedAt: new Date() }).where(and(eq(deviceUsers.id, main.id), eq(deviceUsers.deviceId, main.deviceId)))
}

export async function signOutDeviceUser() {
  const jar = await cookies()
  jar.set(ACTIVE_USER, '', { ...COOKIE_OPTIONS, maxAge: 0 })
  jar.set(SIGNED_OUT, '1', COOKIE_OPTIONS)
}

export async function setMainDeviceUser(id: string) {
  const deviceId = await getDeviceId()
  const users = await listDeviceUsers()
  const target = users.find((user) => user.id === id)
  if (!target) throw new Error('User not found')
  await db.transaction(async (tx) => {
    await tx.update(deviceUsers).set({ isMain: false, updatedAt: new Date() }).where(eq(deviceUsers.deviceId, deviceId))
    await tx.update(deviceUsers).set({ isMain: true, updatedAt: new Date() }).where(and(eq(deviceUsers.id, id), eq(deviceUsers.deviceId, deviceId)))
  })
}

export async function removeDeviceUser(id: string) {
  const deviceId = await getDeviceId()
  const users = await listDeviceUsers()
  const target = users.find((user) => user.id === id)
  if (!target) throw new Error('User not found')
  if (target.isMain) throw new Error('Set another user as main before deleting this user')
  await db.delete(deviceUsers).where(and(eq(deviceUsers.id, id), eq(deviceUsers.deviceId, deviceId)))
  if ((await cookies()).get(ACTIVE_USER)?.value === id) await selectDeviceUser(users.find((user) => user.id !== id)?.id ?? '')
}
