import { estimateTimeInRange, type BgPoint } from '@/lib/t1d'

export function TirCard({ points, days }: { points: BgPoint[]; days: number }) {
  const tir = estimateTimeInRange(points)
  const segments = [
    { key: 'low', label: 'Below 70', value: tir.low, className: 'bg-destructive' },
    { key: 'in', label: '70–180', value: tir.inRange, className: 'bg-primary' },
    { key: 'high', label: 'Above 180', value: tir.high, className: 'bg-warning' },
  ]
  return (
    <section aria-labelledby="tir-title" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 md:p-6">
      <h2 id="tir-title" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Time in range · {days} days
      </h2>
      {tir.readings === 0 ? (
        <p className="text-sm text-muted-foreground">Log a few readings to estimate time in range.</p>
      ) : (
        <>
          <p className="font-mono text-5xl font-medium tabular-nums tracking-tight">
            {tir.inRange}
            <span className="ml-1 text-base text-muted-foreground">%</span>
          </p>
          <div className="flex h-2 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${tir.low}% low, ${tir.inRange}% in range, ${tir.high}% high`}>
            {segments.map((s) => (
              <div key={s.key} className={s.className} style={{ width: `${s.value}%` }} />
            ))}
          </div>
          <dl className="grid grid-cols-3 gap-2 text-xs">
            {segments.map((s) => (
              <div key={s.key} className="flex flex-col">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="font-mono text-sm">{s.value}%</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {tir.interpolated
              ? `Interpolated across ${tir.coveredHours.toFixed(0)} h between ${tir.readings} readings (gaps over 4 h skipped).`
              : `Based on ${tir.readings} readings — log more often for interpolated estimates.`}
          </p>
        </>
      )}
    </section>
  )
}
