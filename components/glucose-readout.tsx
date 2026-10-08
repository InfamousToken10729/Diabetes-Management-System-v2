'use client'

import { useNow } from '@/hooks/use-hydrated'
import { timeAgo } from '@/lib/format'
import { bgStatus } from '@/lib/t1d'
import { cn } from '@/lib/utils'

const SCALE_MIN = 40
const SCALE_MAX = 350
const pos = (v: number) => ((Math.min(Math.max(v, SCALE_MIN), SCALE_MAX) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100

const LABEL = {
  low: 'Low',
  'in-range': 'In range',
  high: 'Above range',
  'very-high': 'Very high',
}

export function GlucoseReadout({
  latest,
  targetLow,
  targetHigh,
}: {
  latest: { value: number; at: string } | null
  targetLow: number
  targetHigh: number
}) {
  const now = useNow()
  const status = latest ? bgStatus(latest.value) : null
  const stale = latest && now > 0 && now - new Date(latest.at).getTime() > 2 * 3600000

  return (
    <section aria-labelledby="readout-title" className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center justify-between">
        <h2 id="readout-title" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Last reading
        </h2>
        {status && (
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              status === 'low' && 'bg-destructive text-destructive-foreground',
              status === 'in-range' && 'bg-primary/15 text-primary',
              (status === 'high' || status === 'very-high') && 'bg-warning/15 text-warning',
            )}
          >
            {LABEL[status]}
          </span>
        )}
      </div>

      {latest ? (
        <div className="flex items-end gap-3">
          <span
            className={cn(
              'font-mono text-7xl font-medium leading-none tracking-tighter tabular-nums md:text-8xl',
              status === 'low' && 'text-destructive',
              (status === 'high' || status === 'very-high') && 'text-warning',
            )}
          >
            {latest.value}
          </span>
          <div className="flex flex-col pb-1.5">
            <span className="font-mono text-sm text-muted-foreground">mg/dL</span>
            <span className={cn('text-sm text-muted-foreground', stale && 'text-warning')}>
              {now > 0 ? timeAgo(latest.at, now) : '\u00a0'}
            </span>
          </div>
        </div>
      ) : (
        <p className="py-6 text-muted-foreground">No readings yet. Log your first glucose value.</p>
      )}

      <div aria-hidden className="flex flex-col gap-1.5">
        <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
          <div className="absolute inset-y-0 left-0 bg-destructive/70" style={{ width: `${pos(70)}%` }} />
          <div
            className="absolute inset-y-0 bg-primary/60"
            style={{ left: `${pos(targetLow)}%`, width: `${pos(targetHigh) - pos(targetLow)}%` }}
          />
          <div className="absolute inset-y-0 right-0 bg-warning/50" style={{ width: `${100 - pos(250)}%` }} />
        </div>
        <div className="relative h-4 font-mono text-[11px] text-muted-foreground">
          {[70, targetLow !== 70 ? targetLow : null, targetHigh, 250].filter(Boolean).map((v) => (
            <span key={v} className="absolute -translate-x-1/2" style={{ left: `${pos(v as number)}%` }}>
              {v}
            </span>
          ))}
          {latest && (
            <span
              className="absolute -top-6 size-3 -translate-x-1/2 rounded-full border-2 border-background bg-foreground"
              style={{ left: `${pos(latest.value)}%` }}
            />
          )}
        </div>
      </div>
    </section>
  )
}
