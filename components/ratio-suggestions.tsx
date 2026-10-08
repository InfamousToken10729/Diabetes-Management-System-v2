'use client'

import { Lightbulb } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateRatio } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { useHydrated } from '@/hooks/use-hydrated'
import type { LogEntry } from '@/lib/db/schema'
import { analyzeRatios } from '@/lib/t1d'

export function RatioSuggestions({
  entries,
  profile,
}: {
  entries: LogEntry[]
  profile: { icr: number | null; isf: number | null; targetBg: number }
}) {
  const hydrated = useHydrated()
  const [dismissed, setDismissed] = useState<string[]>([])
  const [pending, startTransition] = useTransition()
  if (!hydrated) return null

  const suggestions = analyzeRatios(entries.filter((entry) => !entry.spoiledInsulin), profile).filter((s) => !dismissed.includes(s.id))

  return (
    <section aria-labelledby="ratio-title" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="ratio-title" className="text-lg font-semibold">
          Ratio check-up
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Looks at the last 30 days: post-meal readings 1.5–3 h after logged meals, and correction-only doses with a
          re-test 2–4 h later. Needs at least 3 matching events before suggesting anything.
        </p>
      </div>
      {suggestions.length === 0 ? (
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
          No consistent pattern found. Your current ratios look consistent with your logged results.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {suggestions.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
                  <p className="font-mono text-sm">
                    {s.setting === 'icr' ? 'Carb ratio' : 'Correction factor'}: {s.current} → {s.suggested}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pl-8">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await updateRatio(s.setting, s.suggested)
                      toast.success('Ratio updated')
                    })
                  }
                >
                  Apply {s.suggested}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDismissed((d) => [...d, s.id])}>
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Discuss ratio changes with your diabetes care team.</p>
    </section>
  )
}
