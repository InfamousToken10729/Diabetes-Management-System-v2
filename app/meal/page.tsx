import { MealWorkflow } from '@/components/meal-workflow'
import { getEntriesSince, getProfile } from '@/lib/data'

export default async function MealPage() {
  const profile = await getProfile()
  if (!profile) return null
  const entries = await getEntriesSince(1)
  const latest = entries.find((e) => e.bgValue !== null)
  const doses = entries
    .filter((e) => e.insulinUnits !== null)
    .map((e) => ({ at: e.occurredAt.getTime(), units: e.insulinUnits as number }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Meal & dose</h1>
        <p className="text-sm text-muted-foreground">
          Ratio {profile.icr ? `1 U : ${profile.icr} g` : 'learning'} · ISF {profile.isf ? `${profile.isf} mg/dL` : 'learning'} · target {profile.targetBg} mg/dL
        </p>
      </div>
      <MealWorkflow
        profile={{
          icr: profile.icr,
          isf: profile.isf,
          targetBg: profile.targetBg,
          insulinType: profile.insulinType,
          insulinDurationHours: profile.insulinDurationHours,
        }}
        latestBg={latest ? { value: latest.bgValue as number, at: latest.occurredAt.toISOString() } : null}
        doses={doses}
      />
    </div>
  )
}
