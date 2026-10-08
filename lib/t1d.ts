export type ContextTag = 'exercise' | 'sick' | 'stress'

export const CONTEXT_TAGS: { id: ContextTag; label: string; factor: number; hint: string }[] = [
  { id: 'exercise', label: 'Exercise', factor: 0.8, hint: '-20% insulin' },
  { id: 'sick', label: 'Sickness', factor: 1.2, hint: '+20% insulin' },
  { id: 'stress', label: 'Stress', factor: 1.1, hint: '+10% insulin' },
]

export const INSULIN_TYPES: { id: string; peakMinutes: number }[] = [
  { id: 'NovoRapid', peakMinutes: 75 },
  { id: 'Humalog', peakMinutes: 75 },
  { id: 'Apidra', peakMinutes: 75 },
  { id: 'Admelog', peakMinutes: 75 },
  { id: 'Fiasp', peakMinutes: 55 },
  { id: 'Lyumjev', peakMinutes: 55 },
]

export const HYPO_THRESHOLD = 70
export const HYPER_THRESHOLD = 250
export const TIR_LOW = 70
export const TIR_HIGH = 180
export const RESCUE_MINUTES = 15
export const RESCUE_WINDOW_HOURS = 6

export type DoseEvent = { at: number; units: number }

function peakFor(insulinType: string) {
  return INSULIN_TYPES.find((t) => t.id === insulinType)?.peakMinutes ?? 75
}

/** Fraction of a bolus still active after `minutes`, using the exponential insulin action curve. */
export function iobFraction(minutes: number, durationHours: number, insulinType: string) {
  const td = durationHours * 60
  if (minutes <= 0) return 1
  if (minutes >= td) return 0
  const tp = Math.min(peakFor(insulinType), td / 2 - 1)
  const tau = (tp * (1 - tp / td)) / (1 - (2 * tp) / td)
  const a = (2 * tau) / td
  const S = 1 / (1 - a + (1 + a) * Math.exp(-td / tau))
  const t = minutes
  const value =
    1 - S * (1 - a) * ((t * t / (tau * td * (1 - a)) - t / tau - 1) * Math.exp(-t / tau) + 1)
  return Math.max(0, Math.min(1, value))
}

export function insulinOnBoard(
  doses: DoseEvent[],
  now: number,
  durationHours: number,
  insulinType: string,
) {
  return doses.reduce((sum, d) => {
    const minutes = (now - d.at) / 60000
    if (minutes < 0) return sum
    return sum + d.units * iobFraction(minutes, durationHours, insulinType)
  }, 0)
}

export function roundDose(units: number, step = 0.5) {
  return Math.max(0, Math.round(units / step) * step)
}

export type Macros = { carbs: number; protein: number; fat: number; sugar: number }

/** A meal above 20 g fat may cause a delayed glucose rise. */
export function isHighFatProtein(m: Macros) {
  return m.carbs > 0 && m.fat > 20
}

export type DoseInput = {
  bg: number | null
  targetBg: number
  icr: number | null
  isf: number | null
  carbs: number
  sugar: number
  iob: number
  tags: ContextTag[]
  macros: Macros
}

export type DoseResult =
  | { status: 'blocked'; reason: 'hypo' }
  | {
      status: 'ok'
      mealBolus: number
      correctionBolus: number
      tagFactor: number
      iob: number
      raw: number
      total: number
      requiresKetoneCheck: boolean
      split: null | { upfront: number; later: number; laterAfterMinutes: number; percentUpfront: number }
    }

export function recommendDose(input: DoseInput): DoseResult {
  if (input.bg !== null && input.bg < HYPO_THRESHOLD) return { status: 'blocked', reason: 'hypo' }

  const mealBolus = input.icr && input.icr > 0 ? (input.carbs + input.sugar) / input.icr : 0
  const correctionBolus = input.bg !== null && input.isf && input.isf > 0 ? (input.bg - input.targetBg) / input.isf : 0
  const tagFactor = input.tags.reduce(
    (f, tag) => f * (CONTEXT_TAGS.find((t) => t.id === tag)?.factor ?? 1),
    1,
  )

  const raw = (mealBolus + correctionBolus) * tagFactor - input.iob
  const total = roundDose(raw)

  let split: Extract<DoseResult, { status: 'ok' }>['split'] = null
  if (isHighFatProtein(input.macros) && mealBolus > 0) {
    const percentUpfront = 0.6
    const adjustedMeal = mealBolus * tagFactor
    const later = roundDose(adjustedMeal * (1 - percentUpfront))
    const upfront = roundDose(Math.max(0, raw - adjustedMeal * (1 - percentUpfront)))
    split = { upfront, later, laterAfterMinutes: 120, percentUpfront: 60 }
  }

  return {
    status: 'ok',
    mealBolus,
    correctionBolus,
    tagFactor,
    iob: input.iob,
    raw,
    total,
    requiresKetoneCheck: input.bg !== null && input.bg > HYPER_THRESHOLD,
    split,
  }
}

export type BgPoint = { at: number; value: number }

/** Estimate time-in-range by linearly interpolating between readings no more than `maxGapHours` apart. */
export function estimateTimeInRange(points: BgPoint[], maxGapHours = 4) {
  const sorted = [...points].sort((a, b) => a.at - b.at)
  let low = 0
  let inRange = 0
  let high = 0
  const classify = (v: number, weight: number) => {
    if (v < TIR_LOW) low += weight
    else if (v > TIR_HIGH) high += weight
    else inRange += weight
  }

  const STEP = 5
  let covered = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    const minutes = (b.at - a.at) / 60000
    if (minutes <= 0 || minutes > maxGapHours * 60) continue
    for (let m = 0; m < minutes; m += STEP) {
      const w = Math.min(STEP, minutes - m)
      classify(a.value + ((b.value - a.value) * (m + w / 2)) / minutes, w)
    }
    covered += minutes
  }

  // Not enough spacing to interpolate: fall back to counting raw readings.
  if (covered === 0) {
    sorted.forEach((p) => classify(p.value, 1))
  }

  const total = low + inRange + high
  const pct = (x: number) => (total > 0 ? Math.round((x / total) * 100) : 0)
  return {
    readings: sorted.length,
    coveredHours: covered / 60,
    interpolated: covered > 0,
    inRange: pct(inRange),
    low: pct(low),
    high: pct(high),
  }
}

export function mealTimeOf(entry: {
  occurredAt: Date | string
  mealRelation: string | null
  mealOffsetValue: number | null
  mealOffsetUnit: string | null
}) {
  const at = new Date(entry.occurredAt).getTime()
  if (!entry.mealRelation || entry.mealRelation === 'during' || !entry.mealOffsetValue) return at
  const ms = entry.mealOffsetValue * (entry.mealOffsetUnit === 'hours' ? 3600000 : 60000)
  return entry.mealRelation === 'before' ? at + ms : at - ms
}

type AnalysisEntry = {
  occurredAt: Date | string
  bgValue: number | null
  insulinUnits: number | null
  carbs: number | null
  doseKind: string | null
  mealRelation: string | null
  mealOffsetValue: number | null
  mealOffsetUnit: string | null
}

export type RatioSuggestion = {
  id: string
  setting: 'icr' | 'isf'
  title: string
  detail: string
  current: number
  suggested: number
  samples: number
}

function periodOf(ts: number) {
  const h = new Date(ts).getHours()
  if (h >= 4 && h < 11) return 'breakfast'
  if (h >= 11 && h < 16) return 'lunch'
  if (h >= 16 && h < 22) return 'dinner'
  return 'late-night snacks'
}

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function analyzeRatios(
  entries: AnalysisEntry[],
  profile: { icr: number | null; isf: number | null; targetBg: number },
): RatioSuggestion[] {
  const bgs = entries
    .filter((e) => e.bgValue !== null)
    .map((e) => ({ at: new Date(e.occurredAt).getTime(), value: e.bgValue as number }))
    .sort((a, b) => a.at - b.at)
  const firstBgBetween = (from: number, to: number) => bgs.find((b) => b.at >= from && b.at <= to)
  const lastBgBetween = (from: number, to: number) =>
    [...bgs].reverse().find((b) => b.at >= from && b.at <= to)

  const suggestions: RatioSuggestion[] = []

  const byPeriod = new Map<string, number[]>()
  for (const e of entries) {
    if (!e.carbs || e.carbs <= 0 || !e.insulinUnits) continue
    const mealAt = mealTimeOf(e)
    const post = firstBgBetween(mealAt + 90 * 60000, mealAt + 180 * 60000)
    if (!post) continue
    const period = periodOf(mealAt)
    byPeriod.set(period, [...(byPeriod.get(period) ?? []), post.value])
  }

  for (const [period, values] of byPeriod) {
    if (profile.icr === null || values.length < 3) continue
    const med = median(values)
    if (med > TIR_HIGH) {
      const suggested = Math.max(1, Math.round(profile.icr * 0.9 * 10) / 10)
      suggestions.push({
        id: `icr-high-${period}`,
        setting: 'icr',
        title: `BG consistently spikes ~2h after ${period}`,
        detail: `Median post-meal reading is ${Math.round(med)} mg/dL across ${values.length} meals. A stronger (lower) carb ratio means more insulin per gram of carbs.`,
        current: profile.icr,
        suggested,
        samples: values.length,
      })
    } else if (med < 90) {
      const suggested = Math.round(profile.icr * 1.1 * 10) / 10
      suggestions.push({
        id: `icr-low-${period}`,
        setting: 'icr',
        title: `BG trends low ~2h after ${period}`,
        detail: `Median post-meal reading is ${Math.round(med)} mg/dL across ${values.length} meals. A weaker (higher) carb ratio means less insulin per gram of carbs.`,
        current: profile.icr,
        suggested,
        samples: values.length,
      })
    }
  }

  const drops: number[] = []
  for (const e of entries) {
    if (e.doseKind !== 'correction' || !e.insulinUnits || (e.carbs ?? 0) > 0) continue
    const at = new Date(e.occurredAt).getTime()
    const before = lastBgBetween(at - 20 * 60000, at + 5 * 60000)
    const after = firstBgBetween(at + 2 * 3600000, at + 4 * 3600000)
    if (!before || !after) continue
    drops.push((before.value - after.value) / e.insulinUnits)
  }
  if (profile.isf !== null && drops.length >= 3) {
    const actual = median(drops)
    if (actual < profile.isf * 0.8 || actual > profile.isf * 1.2) {
      const suggested = Math.max(5, Math.round((profile.isf + (actual - profile.isf) * 0.5) / 1))
      suggestions.push({
        id: 'isf',
        setting: 'isf',
        title:
          actual < profile.isf
            ? 'Corrections bring BG down less than expected'
            : 'Corrections bring BG down more than expected',
        detail: `Across ${drops.length} correction-only doses, 1 unit lowered BG by a median of ${Math.round(actual)} mg/dL vs. your setting of ${profile.isf}. Suggestion moves halfway toward the observed value.`,
        current: profile.isf,
        suggested,
        samples: drops.length,
      })
    }
  }

  return suggestions
}

export function bgStatus(value: number) {
  if (value < HYPO_THRESHOLD) return 'low' as const
  if (value > HYPER_THRESHOLD) return 'very-high' as const
  if (value > TIR_HIGH) return 'high' as const
  return 'in-range' as const
}
