'use client'

import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { addEntry } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNow } from '@/hooks/use-hydrated'
import { HYPO_THRESHOLD, RESCUE_MINUTES } from '@/lib/t1d'

const FAST_CARBS = ['4 glucose tablets (4 g each)', '150 ml fruit juice or regular soda', '1 tablespoon honey or sugar', '5–6 hard candies']

function beep() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.value = 0.15
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.2)
    })
  } catch {
    // Audio can be blocked before user interaction; the visual alert still shows.
  }
}

export function HypoRescue({ value, loggedAt }: { value: number; loggedAt: string }) {
  const now = useNow(1000)
  const endsAt = new Date(loggedAt).getTime() + RESCUE_MINUTES * 60000
  const remaining = now > 0 ? Math.max(0, endsAt - now) : RESCUE_MINUTES * 60000
  const done = now > 0 && remaining === 0
  const alerted = useRef(false)
  const [retest, setRetest] = useState('')
  const [pending, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!done || alerted.current) return
    alerted.current = true
    beep()
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Re-test your blood glucose', { body: '15 minutes have passed since your low reading.' })
    }
  }, [done])

  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const bg = Math.round(Number(retest))
    if (!bg || bg < 20 || bg > 600) {
      toast.error('Enter a valid reading')
      return
    }
    startTransition(async () => {
      await addEntry({ occurredAt: new Date(), bgValue: bg, tags: [], notes: 'Rescue re-test' })
      setRetest('')
      if (bg < HYPO_THRESHOLD) toast.error(`Still low at ${bg}. Treat again with 15 g fast carbs.`)
      else toast.success(`Back to ${bg} mg/dL. Have a small snack if your next meal is over an hour away.`)
    })
  }

  const statusBar = (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t-4 border-red-950 bg-destructive px-4 py-3 text-destructive-foreground shadow-2xl">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold">Low glucose recovery: {done ? 'Retest now' : `test again in ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}</span>
        <span>Take fast carbs, follow your recovery procedure, then record your new blood glucose reading after the timer ends.</span>
      </div>
    </div>
  )

  if (dismissed) return statusBar

  return (
    <>
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="rescue-title"
      aria-describedby="rescue-desc"
      className="fixed inset-0 z-50 overflow-y-auto bg-destructive text-destructive-foreground"
    >
      <Button type="button" variant="ghost" size="icon" onClick={() => setDismissed(true)} className="absolute right-4 top-4 text-destructive-foreground hover:bg-destructive-foreground/10 hover:text-destructive-foreground" aria-label="Close hypoglycemia warning"><X className="size-5" /></Button>
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center gap-8 px-6 py-10">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-8" aria-hidden />
          <p className="font-mono text-sm uppercase tracking-widest">Hypo rescue mode</p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 id="rescue-title" className="text-balance text-4xl font-semibold leading-tight md:text-5xl">
            {value} mg/dL. Eat 15 g of fast carbs now.
          </h2>
          <p id="rescue-desc" className="leading-relaxed opacity-90">
            Do not take insulin. Sit down, treat, and wait 15 minutes before re-testing. Dosing is locked until your
            glucose is back above {HYPO_THRESHOLD} mg/dL.
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {FAST_CARBS.map((c) => (
            <li key={c} className="rounded-lg border border-destructive-foreground/30 px-4 py-3 text-sm">
              {c}
            </li>
          ))}
        </ul>

        {!done ? (
          <div className="flex flex-col items-start gap-1">
            <span className="text-sm opacity-80">Re-test in</span>
            <span className="font-mono text-7xl font-medium tabular-nums" aria-live="off">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-background p-5 text-foreground">
            <Label htmlFor="retest" className="text-base">
              Time to re-test. Enter your new reading.
            </Label>
            <div className="flex gap-2">
              <Input
                id="retest"
                type="number"
                inputMode="numeric"
                min={20}
                max={600}
                required
                autoFocus
                value={retest}
                onChange={(e) => setRetest(e.target.value)}
                className="h-12 font-mono text-2xl"
              />
              <Button type="submit" size="lg" className="h-12" disabled={pending}>
                {pending ? 'Saving…' : 'Log'}
              </Button>
            </div>
          </form>
        )}
        <p className="text-xs leading-relaxed opacity-80">
          If you cannot swallow safely, are confused, or glucose stays low after two treatments, use glucagon and call
          emergency services.
        </p>
      </div>
    </div>
    {statusBar}
    </>
  )
}
