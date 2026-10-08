'use client'

import { Printer, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useHydrated } from '@/hooks/use-hydrated'
import { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatGlucose, type GlucoseUnit } from '@/lib/glucose-units'
import type { LogEntry, Profile } from '@/lib/db/schema'
import { dayKey, fmtDay } from '@/lib/format'
import { estimateTimeInRange } from '@/lib/t1d'
import { Timeline } from './timeline'

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-4">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-mono text-2xl tabular-nums">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  )
}

export function ReportView({ profile, entries }: { profile: Profile; entries: LogEntry[] }) {
  const hydrated = useHydrated()
  const [range, setRange] = useState('14')
  const filteredEntries = useMemo(() => {
    const cutoff = Date.now() - Number(range) * 86400000
    return entries.filter((entry) => entry.occurredAt.getTime() >= cutoff)
  }, [entries, range])
  const unit: GlucoseUnit = 'mg/dL'
  const bgs = filteredEntries.filter((e) => e.bgValue !== null).map((e) => ({ at: new Date(e.occurredAt).getTime(), value: e.bgValue as number }))
  const tir = estimateTimeInRange(bgs)
  const avg = bgs.length ? bgs.reduce((s, b) => s + b.value, 0) / bgs.length : 0
  const sd = bgs.length ? Math.sqrt(bgs.reduce((s, b) => s + (b.value - avg) ** 2, 0) / bgs.length) : 0
  const gmi = avg ? 3.31 + 0.02392 * avg : 0
  const lows = bgs.filter((b) => b.value < 70).length

  const days = new Set(filteredEntries.map((e) => (hydrated ? dayKey(e.occurredAt) : ''))).size || 1
  const totalInsulin = filteredEntries.reduce((s, e) => s + (e.insulinUnits ?? 0), 0)
  const totalCarbs = entries.reduce((s, e) => s + (e.carbs ?? 0), 0)
  const first = entries.at(-1)?.occurredAt
  const last = entries[0]?.occurredAt

  return (
    <article className="flex flex-col gap-8 print:text-black">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">GlycoGuide · {range}-day summary</p>
          <div className="mt-2 print:hidden"><Select value={range} onValueChange={(value) => value && setRange(value)}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Past 1 week</SelectItem><SelectItem value="14">Past 2 weeks</SelectItem><SelectItem value="30">Past 1 month</SelectItem><SelectItem value="60">Past 2 months</SelectItem><SelectItem value="90">Past 3 months</SelectItem></SelectContent></Select></div>
          <h1 className="text-2xl font-semibold tracking-tight">Type 1 diabetes report</h1>
          {hydrated && first && last && (
            <p className="text-sm text-muted-foreground">
              {fmtDay(first)} – {fmtDay(last)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Link href="/history" aria-label="Close report and return to history" title="Close report" className="inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"><X className="size-4" aria-hidden /></Link>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            Save as PDF
          </Button>
        </div>
      </div>

      <section aria-labelledby="profile-h" className="flex flex-col gap-3">
        <h2 id="profile-h" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Profile & settings
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          {[
            ['Age', profile.age ? `${profile.age} y` : '—'],
            ['Weight', profile.weightKg ? `${profile.weightKg} kg` : '—'],
            ['Height', profile.heightCm ? `${profile.heightCm} cm` : '—'],
            ['Gender', profile.gender ?? '—'],
            ['Insulin', `${profile.insulinType}, ${profile.insulinDurationHours} h`],
            ['Carb ratio', `1 U : ${profile.icr} g`],
            ['Correction factor', `${profile.isf ? formatGlucose(profile.isf, unit) : '—'} ${unit} / U`],
            ['Target', `${formatGlucose(profile.targetLow, unit)}–${formatGlucose(profile.targetHigh, unit)} (aim ${formatGlucose(profile.targetBg, unit)})`],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-mono capitalize">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="stats-h" className="flex flex-col gap-3">
        <h2 id="stats-h" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Glucose
        </h2>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Time in range" value={`${tir.inRange}%`} sub={`${tir.low}% low · ${tir.high}% high`} />
          <Stat label="Average" value={avg ? formatGlucose(avg, unit) : '—'} sub={`${unit} · SD ${formatGlucose(sd, unit)}`} />
          <Stat label="GMI (est. A1c)" value={gmi ? `${gmi.toFixed(1)}%` : '—'} sub={`${bgs.length} readings`} />
          <Stat label="Low readings" value={String(lows)} sub="below 70 mg/dL" />
          <Stat label="Avg insulin / day" value={`${(totalInsulin / days).toFixed(1)} U`} sub="rapid-acting only" />
          <Stat label="Avg carbs / day" value={`${Math.round(totalCarbs / days)} g`} />
        </dl>
      </section>

      <section aria-labelledby="log-h" className="flex flex-col gap-3">
        <h2 id="log-h" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Logbook
        </h2>
        {filteredEntries.some((entry) => entry.spoiledInsulin) && <p className="text-sm font-medium text-destructive">Entries marked “suspected spoiled insulin” are shown for transparency but excluded from ICR and ISF calculations.</p>}
        <div className="rounded-xl border border-border bg-card px-5 pb-5">
          <Timeline entries={filteredEntries} editable={false} />
        </div>
      </section>
    </article>
  )
}
