'use client'

import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { useNow } from '@/hooks/use-hydrated'
import type { BgPoint } from '@/lib/t1d'
import { cn } from '@/lib/utils'

const config = { value: { label: 'Glucose', color: 'var(--chart-1)' } } satisfies ChartConfig
const RANGES = [
  { id: '24h', label: '24 hours', hours: 24 },
  { id: '3d', label: '3 days', hours: 72 },
  { id: '7d', label: '7 days', hours: 168 },
  { id: '14d', label: '14 days', hours: 336 },
]

export function BgChart({ points, targetLow, targetHigh }: { points: BgPoint[]; targetLow: number; targetHigh: number }) {
  const [range, setRange] = useState(RANGES[0])
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const now = useNow(60000)
  const customStart = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : 0
  const customEnd = customTo ? new Date(`${customTo}T23:59:59`).getTime() : 0
  const isCustom = customStart > 0 && customEnd >= customStart
  const from = isCustom ? customStart : now - range.hours * 3600000
  const to = isCustom ? customEnd : now
  const data = now > 0 ? points.filter((p) => p.at >= from && p.at <= to).sort((a, b) => a.at - b.at) : []
  const maxY = Math.max(300, ...data.map((d) => d.value + 20))
  const tick = (t: number) => (to - from <= 36 * 3600000 ? new Date(t).toLocaleTimeString([], { hour: 'numeric' }) : new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }))

  return (
    <section aria-labelledby="chart-title" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="chart-title" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Glucose trend</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-secondary p-1" role="group" aria-label="Quick chart range">
            {RANGES.map((r) => <button key={r.id} type="button" aria-pressed={!isCustom && range.id === r.id} onClick={() => { setRange(r); setCustomFrom(''); setCustomTo('') }} className={cn('rounded-md px-2.5 py-1 text-xs text-muted-foreground', !isCustom && range.id === r.id && 'bg-background text-foreground')}>{r.label}</button>)}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <label htmlFor="trend-from" className="sr-only">Trend start date</label>
            <input id="trend-from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-foreground" />
            <span>to</span>
            <label htmlFor="trend-to" className="sr-only">Trend end date</label>
            <input id="trend-to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-foreground" />
          </div>
        </div>
      </div>
      {data.length === 0 ? <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No readings in this window.</div> : <ChartContainer config={config} className="h-64 w-full"><LineChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><ReferenceArea y1={targetLow} y2={targetHigh} fill="var(--chart-1)" fillOpacity={0.08} /><ReferenceLine y={70} stroke="var(--chart-3)" strokeDasharray="4 4" /><ReferenceLine y={250} stroke="var(--chart-2)" strokeDasharray="4 4" /><XAxis dataKey="at" type="number" scale="time" domain={[from, to]} tickFormatter={tick} tickLine={false} axisLine={false} minTickGap={32} /><YAxis domain={[40, maxY]} tickLine={false} axisLine={false} width={48} /><ChartTooltip content={({ active, payload }) => { const p = payload?.[0]?.payload as BgPoint | undefined; if (!active || !p) return null; return <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md"><p className="font-mono text-base text-foreground">{p.value} mg/dL</p><p className="text-muted-foreground">{new Date(p.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p></div> }} /><Line dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-value)' }} isAnimationActive={false} /></LineChart></ChartContainer>}
    </section>
  )
}
