import { Activity } from 'lucide-react'
import { ProfileForm } from './profile-form'

export function Onboarding() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-12 md:px-6 md:py-16">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm" aria-hidden>
            <Activity className="size-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold tracking-tight">GlycoGuide</span>
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          Set up your dosing profile
        </h1>
        <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          No account, no password. Your data is tied to this browser. Enter the ratios your diabetes care
          team gave you — they drive every dose suggestion and can be changed any time in Settings.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 md:p-8">
        <ProfileForm submitLabel="Start using GlycoGuide" />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        GlycoGuide is a decision-support tool, not a medical device. Always confirm doses against your own judgement
        and your clinician&apos;s guidance.
      </p>
    </main>
  )
}
