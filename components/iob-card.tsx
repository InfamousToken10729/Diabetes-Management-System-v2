'use client'

import { useNow } from '@/hooks/use-hydrated'
import { insulinOnBoard, type DoseEvent } from '@/lib/t1d'

export function IobCard({
  doses,
  durationHours,
  insulinType,
}: {
  doses: DoseEvent[]
  durationHours: number
  insulinType: string
}) {
  const now = useNow()
  const iob = now > 0 ? insulinOnBoard(doses, now, durationHours, insulinType) : null
  const lastDose = [...doses].sort((a, b) => b.at - a.at).find((d) => d.at <= (now || Infinity))
  const clearsAt = lastDose ? lastDose.at + durationHours * 3600000 : null

  return (
    <section aria-labelledby="iob-title" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 md:p-6">
      <h2 id="iob-title" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Insulin on board
      </h2>
      <p className="font-mono text-5xl font-medium tabular-nums tracking-tight">
        {iob === null ? '—' : iob.toFixed(2)}
        <span className="ml-2 text-base text-muted-foreground">U</span>
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {iob !== null && iob > 0.05 && clearsAt
          ? `${insulinType} curve, ${durationHours} h action. Fully cleared around ${new Date(clearsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
          : 'No active rapid-acting insulin.'}
      </p>
    </section>
  )
}
