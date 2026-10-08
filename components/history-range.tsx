'use client'

import { useMemo, useState } from 'react'
import { Timeline } from '@/components/timeline'
import type { LogEntry } from '@/lib/db/schema'

const QUICK = [
  { id: '24h', label: '24 hours', ms: 86400000 },
  { id: '7d', label: '7 days', ms: 7 * 86400000 },
  { id: '14d', label: '14 days', ms: 14 * 86400000 },
  { id: '30d', label: '30 days', ms: 30 * 86400000 },
  { id: '60d', label: '60 days', ms: 60 * 86400000 },
]

export function HistoryRange({ entries }: { entries: LogEntry[] }) {
  const [quick, setQuick] = useState('14d')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const visible = useMemo(() => {
    const now = Date.now()
    const start = from ? new Date(`${from}T00:00:00`).getTime() : now - (QUICK.find((r) => r.id === quick)?.ms ?? 14 * 86400000)
    const end = to ? new Date(`${to}T23:59:59`).getTime() : now
    return entries.filter((entry) => entry.occurredAt.getTime() >= start && entry.occurredAt.getTime() <= end)
  }, [entries, from, quick, to])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex gap-1 rounded-lg bg-secondary p-1" role="group" aria-label="Quick history range">
          {QUICK.map((range) => <button key={range.id} type="button" aria-pressed={!from && !to && quick === range.id} onClick={() => { setQuick(range.id); setFrom(''); setTo('') }} className={`rounded-md px-3 py-1.5 text-xs ${!from && !to && quick === range.id ? 'bg-background text-foreground' : 'text-muted-foreground'}`}>{range.label}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <label htmlFor="history-from" className="sr-only">History start date</label>
          <input id="history-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-foreground" />
          <span>to</span>
          <label htmlFor="history-to" className="sr-only">History end date</label>
          <input id="history-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-foreground" />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card px-5 pb-5 md:px-6">
        <p className="border-b border-border py-4 text-sm text-muted-foreground">Showing {visible.length} entries</p>
        <Timeline entries={visible} />
      </div>
    </div>
  )
}
