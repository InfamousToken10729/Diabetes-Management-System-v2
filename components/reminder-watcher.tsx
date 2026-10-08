'use client'

import { BellRing, Clock } from 'lucide-react'
import { useEffect, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import { completeReminder } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { useNow } from '@/hooks/use-hydrated'
import { fmtTime } from '@/lib/format'

type R = { id: number; dueAt: string; title: string; units: number | null }

export function ReminderWatcher({ reminders }: { reminders: R[] }) {
  const now = useNow(15000)
  const notified = useRef(new Set<number>())
  const [pending, startTransition] = useTransition()

  const due = now > 0 ? reminders.filter((r) => new Date(r.dueAt).getTime() <= now) : []
  const upcoming = now > 0 ? reminders.filter((r) => new Date(r.dueAt).getTime() > now) : []

  useEffect(() => {
    for (const r of due) {
      if (notified.current.has(r.id)) continue
      notified.current.add(r.id)
      toast.warning(r.title, { duration: 10000 })
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Bolus reminder', { body: r.title })
      }
    }
  }, [due])

  if (reminders.length === 0 || now === 0) return null

  const act = (id: number, logDose: boolean) =>
    startTransition(async () => {
      await completeReminder(id, logDose)
      toast.success(logDose ? 'Extended dose logged' : 'Reminder dismissed')
    })

  return (
    <div className="mx-auto mt-4 flex w-full max-w-6xl flex-col gap-2 px-4 md:px-6 print:hidden">
      {due.map((r) => (
        <div
          key={r.id}
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning/10 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <BellRing className="size-5 text-warning" aria-hidden />
            <span className="font-medium">{r.title}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => act(r.id, true)}>
              I took it
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(r.id, false)}>
              Skip
            </Button>
          </div>
        </div>
      ))}
      {upcoming.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <Clock className="size-4 text-muted-foreground" aria-hidden />
            <span>
              {r.title} <span className="text-muted-foreground">at {fmtTime(r.dueAt)}</span>
            </span>
          </div>
          <div className="flex gap-2">
            {'Notification' in window && Notification.permission === 'default' && (
              <Button size="sm" variant="outline" onClick={() => Notification.requestPermission()}>
                Enable alerts
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(r.id, false)}>
              Cancel
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
