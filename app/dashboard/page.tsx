import { ArrowRight, Utensils } from 'lucide-react'
import Link from 'next/link'
import { BgChart } from '@/components/bg-chart'
import { GlucoseReadout } from '@/components/glucose-readout'
import { IobCard } from '@/components/iob-card'
import { LogBgDialog } from '@/components/log-bg-dialog'
import { LogInsulinDialog } from '@/components/log-insulin-dialog'
import { Timeline } from '@/components/timeline'
import { TirCard } from '@/components/tir-card'
import { Button } from '@/components/ui/button'
import { getEntriesSince, getProfile } from '@/lib/data'
import { HYPER_THRESHOLD } from '@/lib/t1d'

export default async function DashboardPage() {
  const profile = await getProfile()
  if (!profile) return null
  const entries = await getEntriesSince(90)

  const bgPoints = entries
    .filter((e) => e.bgValue !== null)
    .map((e) => ({ at: e.occurredAt.getTime(), value: e.bgValue as number }))
  const latest = [...bgPoints].sort((a, b) => b.at - a.at)[0] ?? null
  const doses = entries
    .filter((e) => e.insulinUnits !== null)
    .map((e) => ({ at: e.occurredAt.getTime(), units: e.insulinUnits as number }))
  // eslint-disable-next-line react-hooks/purity -- request-time window on the server
  const dayAgo = Date.now() - 86400000
  const recentEntries = entries.filter((e) => e.occurredAt.getTime() >= dayAgo)
  // eslint-disable-next-line react-hooks/purity -- request-time window on the server
  const showHyper = latest && latest.value > HYPER_THRESHOLD && Date.now() - latest.at < 3 * 3600000

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Log readings and doses as they happen, or backdate them.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LogBgDialog unit="mg/dL" />
          <LogInsulinDialog unit="mg/dL" isf={profile.isf} targetBg={profile.targetBg} />
          <Button size="lg" variant="outline" render={<Link href="/meal" />} nativeButton={false}>
            <Utensils className="size-4" aria-hidden />
            Meal & dose
          </Button>
        </div>
      </div>

      {showHyper && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning/10 px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold text-warning">Glucose {latest.value} mg/dL.</span> Check ketones before any
            correction dose.
          </p>
          <Button size="sm" variant="outline" render={<Link href="/meal" />} nativeButton={false}>
            Open dose calculator
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="md:col-span-2 lg:col-span-1">
          <GlucoseReadout
            latest={latest ? { value: latest.value, at: new Date(latest.at).toISOString() } : null}
            targetLow={profile.targetLow}
            targetHigh={profile.targetHigh}
          />
        </div>
        <IobCard doses={doses} durationHours={profile.insulinDurationHours} insulinType={profile.insulinType} />
        <TirCard points={bgPoints} days={14} />
      </div>

      <BgChart points={bgPoints} targetLow={profile.targetLow} targetHigh={profile.targetHigh} />

      <section aria-labelledby="recent-title" className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-center justify-between">
          <h2 id="recent-title" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Last 24 hours
          </h2>
          <Link href="/history" className="text-sm text-primary hover:underline">
            Full history
          </Link>
        </div>
        <Timeline entries={recentEntries} emptyText="Nothing logged in the last 24 hours." />
      </section>
    </div>
  )
}
