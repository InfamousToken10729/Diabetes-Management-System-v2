import { boolean, integer, pgTable, real, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const deviceUsers = pgTable('device_users', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  displayName: text('display_name').notNull(),
  avatarColor: text('avatar_color').notNull().default('cyan'),
  isMain: boolean('is_main').notNull().default(false),
  passwordHash: text('password_hash'),
  recoveryPhraseHash: text('recovery_phrase_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const profiles = pgTable('profiles', {
  deviceId: text('device_id').primaryKey(),
  username: text('username'),
  glucoseUnit: text('glucose_unit').notNull().default('mg/dL'),
  age: integer('age'),
  weightKg: real('weight_kg'),
  heightCm: real('height_cm'),
  gender: text('gender'),
  targetLow: integer('target_low').notNull().default(70),
  targetHigh: integer('target_high').notNull().default(180),
  targetBg: integer('target_bg').notNull().default(110),
  icr: real('icr'),
  isf: real('isf'),
  insulinType: text('insulin_type').notNull().default('NovoRapid'),
  insulinDurationHours: real('insulin_duration_hours').notNull().default(4),
  aiApiKey: text('ai_api_key'),
  aiModel: text('ai_model'),
  aiBaseUrl: text('ai_base_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const logEntries = pgTable('log_entries', {
  id: serial('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  bgValue: integer('bg_value'),
  ketoneLevel: text('ketone_level'),
  insulinUnits: real('insulin_units'),
  mealRelation: text('meal_relation'),
  mealOffsetValue: integer('meal_offset_value'),
  mealOffsetUnit: text('meal_offset_unit'),
  tags: text('tags').array().notNull().default([]),
  carbs: real('carbs'),
  protein: real('protein'),
  fat: real('fat'),
  sugar: real('sugar'),
  mealDescription: text('meal_description'),
  doseKind: text('dose_kind'),
  notes: text('notes'),
  spoiledInsulin: boolean('spoiled_insulin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  title: text('title').notNull(),
  units: real('units'),
  done: boolean('done').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Profile = typeof profiles.$inferSelect
export type LogEntry = typeof logEntries.$inferSelect
export type Reminder = typeof reminders.$inferSelect
