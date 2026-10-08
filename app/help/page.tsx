import { BookOpen, Calculator, ShieldCheck } from 'lucide-react'

export default function HelpPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">GlycoGuide Help</h1><p className="mt-1 text-sm text-muted-foreground">How your readings, doses, and recommendations are calculated.</p></div>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-5"><BookOpen className="mb-3 size-5 text-primary" /><h2 className="font-semibold">Daily workflow</h2><p className="mt-2 text-sm text-muted-foreground">Record glucose readings, meals, insulin doses, and context tags. Use Meal & Dose to estimate macros and review the dose breakdown before logging.</p></article>
        <article className="rounded-xl border border-border bg-card p-5"><Calculator className="mb-3 size-5 text-primary" /><h2 className="font-semibold">Dose calculations</h2><p className="mt-2 text-sm text-muted-foreground">Meal insulin is calculated as carbohydrates divided by ICR plus sugar divided by ICR. Correction insulin uses glucose above target divided by ISF, minus active insulin on board. High-fat meals may split 60% now and 40% after two hours.</p></article>
        <article className="rounded-xl border border-border bg-card p-5"><ShieldCheck className="mb-3 size-5 text-primary" /><h2 className="font-semibold">Safety first</h2><p className="mt-2 text-sm text-muted-foreground">Recommendations are estimates, not medical instructions. Confirm them against your diabetes care plan. Treat lows promptly and check ketones for high readings according to your sick-day plan.</p></article>
      </section>
      <section className="rounded-xl border border-border bg-card p-5 md:p-6"><h2 className="font-semibold">ICR and ISF checkup</h2><div className="mt-3 space-y-3 text-sm text-muted-foreground"><p>The checkup reviews logged meals with known carbohydrates, insulin, and follow-up glucose values. It compares the observed glucose response with the current insulin-to-carb ratio (ICR) and only suggests a cautious change when there is enough recent evidence.</p><p>ISF review compares correction doses with the glucose change after active insulin time. It accounts for timing and insulin on board, ignores correction-only noise when evaluating meal ratios, and never changes your settings automatically.</p><p>Use the suggestions as a discussion aid with your clinician. Individual insulin needs vary with exercise, illness, stress, hormones, and meal composition.</p></div></section>
    </main>
  )
}
