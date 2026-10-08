export type GlucoseUnit = 'mg/dL' | 'mmol/L'

export const MGDL_PER_MMOL = 18.018

export function toMgDl(value: number, unit: GlucoseUnit) {
  return unit === 'mmol/L' ? value * MGDL_PER_MMOL : value
}

export function fromMgDl(value: number, unit: GlucoseUnit) {
  return unit === 'mmol/L' ? value / MGDL_PER_MMOL : value
}

export function formatGlucose(value: number | null | undefined, unit: GlucoseUnit) {
  if (value == null) return '—'
  return unit === 'mmol/L' ? fromMgDl(value, unit).toFixed(1) : String(Math.round(value))
}

export function unitLabel(unit: GlucoseUnit) {
  return unit
}
