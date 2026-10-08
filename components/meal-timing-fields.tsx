'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type MealTiming = {
  relation: 'before' | 'during' | 'after' | null
  offset: string
  unit: 'minutes' | 'hours'
}

const RELATIONS = [
  { value: 'none', label: 'Not linked to a meal' },
  { value: 'before', label: 'Before meal' },
  { value: 'during', label: 'With meal' },
  { value: 'after', label: 'After meal' },
]

const UNITS = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
]

export function MealTimingFields({
  value,
  onChange,
  allowNone = true,
}: {
  value: MealTiming
  onChange: (v: MealTiming) => void
  allowNone?: boolean
}) {
  const items = allowNone ? RELATIONS : RELATIONS.slice(1)
  const showOffset = value.relation === 'before' || value.relation === 'after'
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="meal-relation">Timing relative to meal</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={items}
          value={value.relation ?? 'none'}
          onValueChange={(v) =>
            onChange({ ...value, relation: v === 'none' || !v ? null : (v as MealTiming['relation']) })
          }
        >
          <SelectTrigger id="meal-relation" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showOffset && (
          <>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              aria-label="Offset amount"
              value={value.offset}
              onChange={(e) => onChange({ ...value, offset: e.target.value })}
              className="w-20 font-mono"
            />
            <Select
              items={UNITS}
              value={value.unit}
              onValueChange={(v) => v && onChange({ ...value, unit: v as MealTiming['unit'] })}
            >
              <SelectTrigger aria-label="Offset unit" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </div>
  )
}

export function timingToEntry(t: MealTiming) {
  const offset = Number(t.offset)
  const hasOffset = (t.relation === 'before' || t.relation === 'after') && Number.isFinite(offset) && offset > 0
  return {
    mealRelation: t.relation,
    mealOffsetValue: hasOffset ? Math.round(offset) : null,
    mealOffsetUnit: hasOffset ? t.unit : null,
  }
}
