import { ProfileForm } from '@/components/profile-form'
import { RatioSuggestions } from '@/components/ratio-suggestions'
import { getEntriesSince, getProfile } from '@/lib/data'
import { ClearDataButton } from '@/components/clear-data-button'
import { PasswordForm } from '@/components/user-menu'

export default async function SettingsPage() {
  const profile = await getProfile()
  if (!profile) return null
  const entries = await getEntriesSince(30)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Your profile is saved to this browser — no account needed.</p>
      </div>
      <RatioSuggestions entries={entries} profile={{ icr: profile.icr, isf: profile.isf, targetBg: profile.targetBg }} />
      <div className="rounded-xl border border-border bg-card p-5 md:p-6">
        <ProfileForm key={profile.updatedAt.toISOString()} profile={profile} />
      </div>
      <div className="rounded-xl border border-border bg-card p-5 md:p-6">
        <h2 className="font-semibold">Main account password</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Only the main account can change this password.</p>
        <PasswordForm />
      </div>
      <div className="rounded-xl border border-destructive/30 bg-card p-5 md:p-6">
        <h2 className="font-semibold">Data controls</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Remove all readings, doses, meals, reminders, and your profile from this device.</p>
        <ClearDataButton />
      </div>
    </div>
  )
}
