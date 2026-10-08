'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { logEntries, profiles, reminders } from '@/lib/db/schema'
import { getDeviceId } from '@/lib/device'

const profileSchema = z.object({
  username: z.string().trim().min(1).max(60),
  glucoseUnit: z.enum(['mg/dL', 'mmol/L']),
  age: z.coerce.number().int().min(1).max(120).nullable(),
  weightKg: z.coerce.number().min(2).max(400).nullable(),
  heightCm: z.coerce.number().min(30).max(250).nullable(),
  gender: z.enum(['female', 'male', 'other']).nullable(),
  targetLow: z.coerce.number().int().min(60).max(150),
  targetHigh: z.coerce.number().int().min(100).max(300),
  targetBg: z.coerce.number().int().min(70).max(200),
  icr: z.preprocess((v) => v === '' || v === null ? null : Number(v), z.number().min(1).max(100).nullable()),
  isf: z.preprocess((v) => v === '' || v === null ? null : Number(v), z.number().min(5).max(400).nullable()),
  insulinType: z.string().min(1).max(40),
  insulinDurationHours: z.coerce.number().min(3).max(6),
  aiApiKey: z.string().max(500).nullable(),
  aiModel: z.string().max(120).nullable(),
  aiBaseUrl: z.string().url().max(500).nullable(),
})

export type ProfileInput = z.input<typeof profileSchema>

export async function saveProfile(input: ProfileInput) {
  const deviceId = await getDeviceId()
  const data = profileSchema.parse(input)
  if (data.targetLow >= data.targetHigh) throw new Error('Target low must be below target high')
  await db
    .insert(profiles)
    .values({ deviceId, ...data })
    .onConflictDoUpdate({ target: profiles.deviceId, set: { ...data, updatedAt: new Date() } })
  revalidatePath('/', 'layout')
}

export async function updateRatio(setting: 'icr' | 'isf', value: number) {
  const deviceId = await getDeviceId()
  const v = z.number().min(1).max(400).parse(value)
  await db
    .update(profiles)
    .set(setting === 'icr' ? { icr: v, updatedAt: new Date() } : { isf: v, updatedAt: new Date() })
    .where(eq(profiles.deviceId, deviceId))
  revalidatePath('/', 'layout')
}

const optionalNum = (min: number, max: number) => z.number().min(min).max(max).nullable().optional()

const entrySchema = z
  .object({
    occurredAt: z.coerce.date(),
    bgValue: z.number().int().min(20).max(600).nullable().optional(),
    ketoneLevel: z.enum(['none', 'trace', 'small', 'moderate', 'large']).nullable().optional(),
    insulinUnits: optionalNum(0.1, 100),
    mealRelation: z.enum(['before', 'during', 'after']).nullable().optional(),
    mealOffsetValue: z.number().int().min(0).max(600).nullable().optional(),
    mealOffsetUnit: z.enum(['minutes', 'hours']).nullable().optional(),
    tags: z.array(z.enum(['exercise', 'sick', 'stress'])).max(3).default([]),
    carbs: optionalNum(0, 1000),
    protein: optionalNum(0, 1000),
    fat: optionalNum(0, 1000),
    sugar: optionalNum(0, 1000),
    mealDescription: z.string().max(1000).nullable().optional(),
    doseKind: z.enum(['meal', 'correction', 'split-upfront', 'split-extended']).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    spoiledInsulin: z.boolean().optional().default(false),
  })
  .refine((e) => e.bgValue != null || e.insulinUnits != null || e.carbs != null, {
    message: 'Entry must contain a glucose reading, insulin dose, or meal',
  })
  .refine((e) => e.occurredAt.getTime() <= Date.now() + 5 * 60000, {
    message: 'Entry time cannot be in the future',
  })

export type EntryInput = z.input<typeof entrySchema>

export async function addEntry(input: EntryInput) {
  const deviceId = await getDeviceId()
  const data = entrySchema.parse(input)
  const [row] = await db
    .insert(logEntries)
    .values({ deviceId, ...data })
    .returning({ id: logEntries.id })
  revalidatePath('/', 'layout')
  return row.id
}

export async function updateEntry(id: number, input: EntryInput) {
  const deviceId = await getDeviceId()
  const data = entrySchema.parse(input)
  await db
    .update(logEntries)
    .set(data)
    .where(and(eq(logEntries.id, z.number().int().parse(id)), eq(logEntries.deviceId, deviceId)))
  revalidatePath('/', 'layout')
}

export async function clearAllData() {
  const deviceId = await getDeviceId()
  await db.delete(reminders).where(eq(reminders.deviceId, deviceId))
  await db.delete(logEntries).where(eq(logEntries.deviceId, deviceId))
  await db.delete(profiles).where(eq(profiles.deviceId, deviceId))
  revalidatePath('/', 'layout')
}

export async function setSpoiledInsulin(id: number, excluded: boolean) {
  const deviceId = await getDeviceId()
  await db.update(logEntries).set({ spoiledInsulin: excluded }).where(and(eq(logEntries.id, z.number().int().parse(id)), eq(logEntries.deviceId, deviceId)))
  revalidatePath('/', 'layout')
}

export async function deleteEntry(id: number) {
  const deviceId = await getDeviceId()
  await db
    .delete(logEntries)
    .where(and(eq(logEntries.id, z.number().int().parse(id)), eq(logEntries.deviceId, deviceId)))
  revalidatePath('/', 'layout')
}

export async function logDoseWithSplit(input: {
  entry: EntryInput
  reminder: { units: number; afterMinutes: number } | null
}) {
  const deviceId = await getDeviceId()
  const id = await addEntry(input.entry)
  if (input.reminder) {
    const r = z
      .object({ units: z.number().min(0.5).max(50), afterMinutes: z.number().int().min(15).max(360) })
      .parse(input.reminder)
    await db.insert(reminders).values({
      deviceId,
      dueAt: new Date(Date.now() + r.afterMinutes * 60000),
      title: `Extended bolus: take remaining ${r.units} U`,
      units: r.units,
    })
    revalidatePath('/', 'layout')
  }
  return id
}

export async function completeReminder(id: number, logDose: boolean) {
  const deviceId = await getDeviceId()
  const [reminder] = await db
    .update(reminders)
    .set({ done: true })
    .where(and(eq(reminders.id, z.number().int().parse(id)), eq(reminders.deviceId, deviceId)))
    .returning()
  if (reminder && logDose && reminder.units) {
    await db.insert(logEntries).values({
      deviceId,
      occurredAt: new Date(),
      insulinUnits: reminder.units,
      doseKind: 'split-extended',
      notes: 'Second half of split bolus',
    })
  }
  revalidatePath('/', 'layout')
}
