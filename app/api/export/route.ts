import { getAllEntries } from '@/lib/data'

function formatTimestamp(value: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const month = pad(value.getMonth() + 1)
  const day = pad(value.getDate())
  const hour24 = value.getHours()
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const hour = hour24 % 12 || 12
  return `${value.getFullYear()}-${month}-${day} ${pad(hour)}:${pad(value.getMinutes())} ${suffix}`
}

function cell(value: unknown) {
  if (value === null || value === undefined) return ''
  let s = value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.join('|') : String(value)
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  const entries = await getAllEntries()
  const header = [
    'timestamp',
    'bg_mg_dl',
    'insulin_units',
    'dose_kind',
    'meal_relation',
    'meal_offset',
    'carbs_g',
    'protein_g',
    'fat_g',
    'sugar_g',
    'meal_description',
    'tags',
    'notes',
    'spoiled_insulin_exclusion',
  ]
  const rows = entries.map((e) =>
    [
      formatTimestamp(e.occurredAt),
      e.bgValue,
      e.insulinUnits,
      e.doseKind,
      e.mealRelation,
      e.mealOffsetValue != null ? `${e.mealOffsetValue} ${e.mealOffsetUnit}` : null,
      e.carbs,
      e.protein,
      e.fat,
      e.sugar,
      e.mealDescription,
      e.tags,
      e.notes,
      e.spoiledInsulin ? 'Yes — excluded from ICR and ISF calculations (suspected spoiled insulin)' : 'No',
    ]
      .map(cell)
      .join(','),
  )
  const csv = [header.join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="t1d-log-${date}.csv"`,
    },
  })
}
