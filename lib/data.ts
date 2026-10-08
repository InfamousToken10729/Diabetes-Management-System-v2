import 'server-only'
import { and, asc, desc, eq, gte } from 'drizzle-orm'
import { db } from './db'
import { logEntries, profiles, reminders } from './db/schema'
import { getDeviceId } from './device'

export async function getProfile() {
  const deviceId = await getDeviceId()
  const rows = await db.select().from(profiles).where(eq(profiles.deviceId, deviceId)).limit(1)
  return rows[0] ?? null
}

export async function getEntriesSince(days: number) {
  const deviceId = await getDeviceId()
  const since = new Date(Date.now() - days * 86400000)
  return db
    .select()
    .from(logEntries)
    .where(and(eq(logEntries.deviceId, deviceId), gte(logEntries.occurredAt, since)))
    .orderBy(desc(logEntries.occurredAt))
}

export async function getAllEntries() {
  const deviceId = await getDeviceId()
  return db
    .select()
    .from(logEntries)
    .where(eq(logEntries.deviceId, deviceId))
    .orderBy(asc(logEntries.occurredAt))
}

export async function getLatestBg() {
  const deviceId = await getDeviceId()
  const rows = await db
    .select()
    .from(logEntries)
    .where(eq(logEntries.deviceId, deviceId))
    .orderBy(desc(logEntries.occurredAt), desc(logEntries.id))
    .limit(30)
  return rows.find((r) => r.bgValue !== null) ?? null
}

export async function getPendingReminders() {
  const deviceId = await getDeviceId()
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.deviceId, deviceId), eq(reminders.done, false)))
    .orderBy(asc(reminders.dueAt))
}
