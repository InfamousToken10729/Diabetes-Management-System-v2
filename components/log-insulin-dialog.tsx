'use client'

import { Syringe } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { addEntry } from '@/app/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ContextTag } from '@/lib/t1d'
import { cn } from '@/lib/utils'
import { toMgDl, type GlucoseUnit } from '@/lib/glucose-units'
import { MealTimingFields, timingToEntry, type MealTiming } from './meal-timing-fields'
import { TagPicker } from './tag-picker'
import { WhenPicker } from './when-picker'

export function LogInsulinDialog({ unit = 'mg/dL', isf, targetBg, insulinOnBoard = 0 }: { unit?: GlucoseUnit; isf?: number | null; targetBg?: number; insulinOnBoard?: number }) {
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState('')
  const [kind, setKind] = useState<'meal' | 'correction'>('meal')
  const [timing, setTiming] = useState<MealTiming>({ relation: 'before', offset: '15', unit: 'minutes' })
  const [carbs, setCarbs] = useState('')
  const [correctionBg, setCorrectionBg] = useState('')
  const [when, setWhen] = useState<Date | null>(null)
  const [tags, setTags] = useState<ContextTag[]>([])
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()
  const currentMg = correctionBg === '' ? null : toMgDl(Number(correctionBg), unit)
  const safeCorrection = currentMg !== null && isf && currentMg > 80 ? Math.max(0, (currentMg - (targetBg ?? 110)) / isf - insulinOnBoard) : 0
  const enteredUnits = Number(units)
  const rescueCarbs = currentMg !== null && isf && enteredUnits > safeCorrection ? Math.ceil(((enteredUnits - safeCorrection) * isf) / 4) : 0

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const u = Number(units)
    if (!u || u <= 0 || u > 100) {
      toast.error('Enter a dose between 0.1 and 100 units')
      return
    }
      const c = carbs === '' ? null : Number(carbs)
      const correctionReading = correctionBg === '' ? null : Number(correctionBg)

    startTransition(async () => {
      try {
        await addEntry({
          occurredAt: when ?? new Date(),
          insulinUnits: Math.round(u * 10) / 10,
          bgValue: kind === 'correction' && correctionReading !== null && Number.isFinite(correctionReading) ? Math.round(correctionReading) : null,
          doseKind: kind,
          ...(kind === 'meal' ? timingToEntry(timing) : { mealRelation: null }),
          carbs: kind === 'meal' && c !== null && c >= 0 ? c : null,
          tags,
          notes: notes.trim() || null,
        })
        setOpen(false)
        setUnits('')
        setCarbs('')
        setCorrectionBg('')
        setNotes('')
        setWhen(null)
        setTags([])
        toast.success(`Logged ${u} U`)
      } catch {
        toast.error('Could not save this dose')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="lg" variant="outline">
            <Syringe className="size-4" aria-hidden />
            Log insulin
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Log rapid-acting insulin</DialogTitle>
            <DialogDescription>Used for insulin-on-board and ratio analysis.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ins-units">Dose (units)</Label>
            <Input
              id="ins-units"
              type="number"
              inputMode="decimal"
              step="0.5"
              min={0.1}
              max={100}
              required
              autoFocus
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="h-14 font-mono text-3xl"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Dose type</Label>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Dose type">
              {(['meal', 'correction'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={cn(
                    'rounded-md border border-border px-3 py-2 text-sm capitalize text-muted-foreground',
                    kind === k && 'border-primary bg-primary/15 text-foreground',
                  )}
                >
                  {k === 'meal' ? 'Meal bolus' : 'Correction only'}
                </button>
              ))}
            </div>
          </div>
          {kind === 'correction' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="ins-correction-bg">Current glucose ({unit}, optional)</Label>
              <Input id="ins-correction-bg" type="number" inputMode="numeric" min={20} max={600} value={correctionBg} onChange={(e) => setCorrectionBg(e.target.value)} placeholder="Add reading if you want to track it" />
              <p className="text-xs text-muted-foreground">This reading is saved with the correction dose for ratio checkup.</p>
              {currentMg !== null && isf && <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm"><p><strong>Safe correction estimate:</strong> {safeCorrection.toFixed(1)} U, aiming above 70 mg/dL.</p>{safeCorrection === 0 && <p className="mt-1 text-warning">No standard correction recommended at this reading. Consider carbohydrates and follow your care plan.</p>}{rescueCarbs > 0 && <p className="mt-1 text-warning">Your entered dose exceeds the estimate. Consider about {rescueCarbs} g carbohydrate to reduce low-glucose risk and retest.</p>}</div>}
            </div>
          )}
          {kind === 'meal' && (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <MealTimingFields value={timing} onChange={setTiming} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="ins-carbs">Carbs (g)</Label>
                <Input
                  id="ins-carbs"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-24 font-mono"
                />
              </div>
            </div>
          )}
          <WhenPicker value={when} onChange={setWhen} />
          <TagPicker value={tags} onChange={setTags} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="ins-notes">Notes</Label>
            <Textarea id="ins-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save dose'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
