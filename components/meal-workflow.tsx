'use client'

import { AlertTriangle, Check, Clock, ShieldAlert } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { logDoseWithSplit } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useNow } from '@/hooks/use-hydrated'
import { fmtUnits, timeAgo } from '@/lib/format'
import {
  HYPER_THRESHOLD,
  HYPO_THRESHOLD,
  insulinOnBoard,
  recommendDose,
  type ContextTag,
  type DoseEvent,
  type Macros,
} from '@/lib/t1d'
import { cn } from '@/lib/utils'
import { MealAnalyzer } from './meal-analyzer'
import { MealTimingFields, timingToEntry, type MealTiming } from './meal-timing-fields'
import { TagPicker } from './tag-picker'

type Props = {
  profile: { icr: number | null; isf: number | null; targetBg: number; insulinType: string; insulinDurationHours: number }
  latestBg: { value: number; at: string } | null
  doses: DoseEvent[]
}

type Ketones = 'negative' | 'moderate' | 'large' | null

const KETONE_OPTIONS: { id: Exclude<Ketones, null>; label: string; detail: string }[] = [
  { id: 'negative', label: 'Negative / trace', detail: '< 0.6 mmol/L' },
  { id: 'moderate', label: 'Small to moderate', detail: '0.6–1.5 mmol/L' },
  { id: 'large', label: 'Large', detail: '> 1.5 mmol/L' },
]

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className={cn('text-sm', muted ? 'text-muted-foreground' : '')}>{label}</dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  )
}

export function MealWorkflow({ profile, latestBg, doses }: Props) {
  const now = useNow(30000)
  const recent = latestBg && now > 0 && now - new Date(latestBg.at).getTime() < 30 * 60000
  const [description, setDescription] = useState('')
  const [macros, setMacros] = useState<Record<keyof Macros, string>>({ carbs: '', protein: '', fat: '', sugar: '' })
  const [bgInput, setBgInput] = useState<string | null>(null)
  const [tags, setTags] = useState<ContextTag[]>([])
  const [timing, setTiming] = useState<MealTiming>({ relation: 'before', offset: '15', unit: 'minutes' })
  const [ketones, setKetones] = useState<Ketones>(null)
  const [useSplit, setUseSplit] = useState(true)
  const [includeIob, setIncludeIob] = useState(true)
  const [actualDose, setActualDose] = useState('')
  const [pending, startTransition] = useTransition()

  const bgText = bgInput ?? (recent && latestBg ? String(latestBg.value) : '')
  const bg = bgText === '' ? null : Math.round(Number(bgText))
  const bgFromLog = bgInput === null && !!recent
  const m: Macros = {
    carbs: Number(macros.carbs) || 0,
    protein: Number(macros.protein) || 0,
    fat: Number(macros.fat) || 0,
    sugar: Number(macros.sugar) || 0,
  }
  // Credit only insulin that will still be active two hours after the meal, rather than treating an older bolus like a fresh dose.
  const iobNow = now > 0 ? insulinOnBoard(doses, now, profile.insulinDurationHours, profile.insulinType) : 0
  const usableIob = now > 0 ? insulinOnBoard(doses, now + 2 * 60 * 60000, profile.insulinDurationHours, profile.insulinType) : 0
  const iob = includeIob ? usableIob : 0
  const result = recommendDose({ bg, targetBg: profile.targetBg, icr: profile.icr, isf: profile.isf, carbs: m.carbs, sugar: m.sugar, iob, tags, macros: m })
  const needsKetones = result.status === 'ok' && result.requiresKetoneCheck
  const ketoneGate = needsKetones && ketones === null
  const split = result.status === 'ok' && useSplit ? result.split : null
  const nothingToDose = m.carbs <= 0 && bg === null

  function log() {
    if (result.status !== 'ok') return
    const enteredDose = actualDose === '' ? null : Number(actualDose)
    const units = enteredDose !== null && Number.isFinite(enteredDose) ? enteredDose : split ? split.upfront : result.total
    if (units <= 0) return
    startTransition(async () => {
      try {
        await logDoseWithSplit({
          entry: {
            occurredAt: new Date(),
            insulinUnits: units > 0 ? units : null,
            bgValue: bg !== null && !bgFromLog ? bg : null,
            doseKind: split ? 'split-upfront' : m.carbs > 0 ? 'meal' : 'correction',
            ...(m.carbs > 0 ? timingToEntry(timing) : { mealRelation: null }),
            carbs: m.carbs > 0 ? m.carbs : null,
            protein: m.carbs > 0 ? m.protein : null,
            fat: m.carbs > 0 ? m.fat : null,
            sugar: m.carbs > 0 ? m.sugar : null,
            mealDescription: description.trim() || null,
            tags,
            notes: ketones && ketones !== 'negative' ? `Ketones: ${ketones}` : null,
          },
          reminder: split && split.later > 0 ? { units: split.later, afterMinutes: split.laterAfterMinutes } : null,
        })
        if (split && 'Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission()
        }
        toast.success(split ? `Logged ${fmtUnits(units)} · reminder set for the remaining ${fmtUnits(split.later)}` : `Logged ${fmtUnits(units)}`)
        setDescription('')
        setMacros({ carbs: '', protein: '', fat: '', sugar: '' })
        setBgInput(null)
        setKetones(null)
        setTags([])
      } catch {
        toast.error('Could not log this dose')
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <MealAnalyzer description={description} onDescriptionChange={setDescription} macros={macros} onMacrosChange={setMacros} />

      <section aria-labelledby="dose-title" className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 md:p-6 lg:sticky lg:top-20 lg:self-start">
        <h2 id="dose-title" className="text-lg font-semibold">
          2 · Dose suggestion
        </h2>

        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dose-bg">Current BG (mg/dL)</Label>
            <Input
              id="dose-bg"
              type="number"
              inputMode="numeric"
              min={20}
              max={600}
              value={bgText}
              onChange={(e) => {
                setBgInput(e.target.value)
                setKetones(null)
              }}
              className="w-32 font-mono text-lg"
            />
            <p className="text-xs text-muted-foreground">
              {bgFromLog && latestBg ? `From log, ${timeAgo(latestBg.at, now)}` : 'Will be logged with the dose'}
            </p>
          </div>
          <MealTimingFields value={timing} onChange={setTiming} allowNone={false} />
        </div>
        <TagPicker value={tags} onChange={setTags} showHints />

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary/40 px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="include-iob" className="cursor-pointer">Subtract insulin on board</Label>
            <p className="text-xs text-muted-foreground">Only insulin still active 2 hours after this meal is credited.</p>
          </div>
          <Switch id="include-iob" checked={includeIob} onCheckedChange={setIncludeIob} aria-label="Subtract insulin on board" />
        </div>

        {result.status === 'blocked' ? (
          <div role="alert" className="flex gap-3 rounded-lg bg-destructive p-4 text-destructive-foreground">
            <ShieldAlert className="size-5 shrink-0" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Dosing locked — BG below {HYPO_THRESHOLD}</p>
              <p className="text-sm leading-relaxed opacity-90">
                Treat the low with 15 g of fast carbs first. Log the reading to start rescue mode.
              </p>
            </div>
          </div>
        ) : nothingToDose ? (
          <p className="rounded-lg bg-secondary px-4 py-6 text-center text-sm text-muted-foreground">
            Enter carbs or a BG reading to see a suggestion.
          </p>
        ) : (
          <>
            {needsKetones && (
              <div role="alert" className="flex flex-col gap-3 rounded-lg border border-warning bg-warning/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold">BG above {HYPER_THRESHOLD}: check ketones first</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Test blood or urine ketones before taking a correction. Enter your result to continue.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Ketone result">
                  {KETONE_OPTIONS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      aria-pressed={ketones === k.id}
                      onClick={() => setKetones(k.id)}
                      className={cn(
                        'flex flex-col items-start rounded-md border border-border bg-background px-3 py-2 text-left text-sm',
                        ketones === k.id && 'border-warning',
                      )}
                    >
                      {k.label}
                      <span className="font-mono text-xs text-muted-foreground">{k.detail}</span>
                    </button>
                  ))}
                </div>
                {ketones === 'moderate' && (
                  <p className="text-sm leading-relaxed">
                    Drink water, avoid exercise and re-check BG and ketones in 2 hours. Contact your care team if
                    ketones rise.
                  </p>
                )}
                {ketones === 'large' && (
                  <p className="text-sm font-medium leading-relaxed text-destructive">
                    Large ketones can signal DKA. Contact your care team or emergency services now, especially with
                    nausea, vomiting or abdominal pain.
                  </p>
                )}
              </div>
            )}

            {!ketoneGate && result.status === 'ok' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between gap-4 rounded-lg bg-secondary p-4">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      {split ? 'Take now' : 'Suggested dose'}
                    </span>
                    <span className="font-mono text-6xl font-medium tabular-nums tracking-tight text-primary">
                      {(split ? split.upfront : result.total).toFixed(1)}
                      <span className="ml-1 text-xl text-muted-foreground">U</span>
                    </span>
                  </div>
                  {split && (
                    <div className="flex flex-col items-end pb-2 text-right">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">In 2 h</span>
                      <span className="font-mono text-2xl tabular-nums">{split.later.toFixed(1)} U</span>
                    </div>
                  )}
                </div>

                <dl className="divide-y divide-border">
                  <Row label={`Carbs · ${m.carbs} g ÷ ${profile.icr ?? '—'}`} value={`${(m.carbs / (profile.icr ?? 1)).toFixed(2)} U`} />
                  <Row label={`Sugar · ${m.sugar} g ÷ ${profile.icr ?? '—'}`} value={`${(m.sugar / (profile.icr ?? 1)).toFixed(2)} U`} />
                  <Row
                    label={bg !== null ? `Correction · (${bg} − ${profile.targetBg}) ÷ ${profile.isf}` : 'Correction · no BG entered'}
                    value={`${result.correctionBolus >= 0 ? '' : '−'}${Math.abs(result.correctionBolus).toFixed(2)} U`}
                  />
                  {result.tagFactor !== 1 && <Row label="Context adjustment" value={`× ${result.tagFactor.toFixed(2)}`} />}
                  <Row label={includeIob ? `Usable IOB at +2 h (now ${iobNow.toFixed(2)} U)` : 'Insulin on board not included'} value={includeIob ? `− ${result.iob.toFixed(2)} U` : '0.00 U'} />
                  <Row label="Rounded to nearest 0.5 U" value={`${result.total.toFixed(1)} U`} muted />
                </dl>

                {result.raw < 0 && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Active insulin already covers this. Consider eating carbs if BG is dropping.
                  </p>
                )}

                {result.split && (
                  <div className="flex flex-col gap-3 rounded-lg border border-primary/40 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                        <div className="flex flex-col gap-1">
                          <p className="font-medium">High-fat meal detected</p>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            Fat and protein slow digestion and can cause a late rise. Split the meal bolus: {result.split.percentUpfront}%
                            now, the rest in 2 hours. You&apos;ll get a reminder.
                          </p>
                        </div>
                      </div>
                      <Switch checked={useSplit} onCheckedChange={setUseSplit} aria-label="Use split bolus" />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                  <Label htmlFor="actual-dose">Dose actually taken (U)</Label>
                  <Input id="actual-dose" type="number" min="0.1" max="100" step="0.1" inputMode="decimal" placeholder={(split ? split.upfront : result.total).toFixed(1)} value={actualDose} onChange={(e) => setActualDose(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Optional. Leave blank to log the suggested dose.</p>
                </div>
                <Button size="lg" onClick={log} disabled={pending || (actualDose === '' && result.total <= 0) || ketones === 'large'}>
                  <Check className="size-4" aria-hidden />
                  {pending ? 'Logging…' : `Log ${actualDose || (split ? split.upfront : result.total).toFixed(1)} U`}
                </Button>
              </div>
            )}
          </>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Suggestions use your saved ratios. Always apply your own judgement.
        </p>
      </section>
    </div>
  )
}
