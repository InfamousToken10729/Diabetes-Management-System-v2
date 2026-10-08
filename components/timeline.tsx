'use client'

import { Droplet, Edit2, Syringe, Trash2, Utensils } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { deleteEntry, setSpoiledInsulin, updateEntry } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useHydrated } from '@/hooks/use-hydrated'
import type { LogEntry } from '@/lib/db/schema'
import { dayKey, fmtDay, fmtTime, fmtUnits } from '@/lib/format'
import { bgStatus } from '@/lib/t1d'
import { cn } from '@/lib/utils'

const DOSE_LABEL: Record<string, string> = {
  meal: 'Meal bolus',
  correction: 'Correction',
  'split-upfront': 'Split bolus · upfront',
  'split-extended': 'Split bolus · extended',
}

function EditEntryDialog({ entry, open, onOpenChange }: { entry: LogEntry; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [pending, startTransition] = useTransition()
  const [bg, setBg] = useState(entry.bgValue?.toString() ?? '')
  const [units, setUnits] = useState(entry.insulinUnits?.toString() ?? '')
  const [carbs, setCarbs] = useState(entry.carbs?.toString() ?? '')
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [ketones, setKetones] = useState(entry.ketoneLevel ?? 'none')

  function save() {
    const nextBg = bg.trim() === '' ? null : Math.round(Number(bg))
    if (nextBg !== null && (!Number.isFinite(nextBg) || nextBg < 1 || nextBg > 1000)) {
      toast.error('Enter a valid blood glucose value')
      return
    }
    const nextUnits = units.trim() === '' ? null : Number(units)
    const nextCarbs = carbs.trim() === '' ? null : Number(carbs)
    if (nextUnits !== null && (!Number.isFinite(nextUnits) || nextUnits < 0)) {
      toast.error('Enter a valid insulin dose')
      return
    }
    if (nextCarbs !== null && (!Number.isFinite(nextCarbs) || nextCarbs < 0)) {
      toast.error('Enter valid carbs')
      return
    }
    startTransition(async () => {
      try {
        await updateEntry(entry.id, {
          ...entry,
          occurredAt: new Date(entry.occurredAt),
          bgValue: nextBg,
          ketoneLevel: nextBg !== null && nextBg > 250 && ketones !== 'none' ? ketones as 'trace' | 'small' | 'moderate' | 'large' : null,
          insulinUnits: nextUnits,
          carbs: nextCarbs,
          notes: notes.trim() || null,
          mealRelation: entry.mealRelation === 'before' || entry.mealRelation === 'during' || entry.mealRelation === 'after' ? entry.mealRelation : null,
          mealOffsetUnit: entry.mealOffsetUnit === 'minutes' || entry.mealOffsetUnit === 'hours' ? entry.mealOffsetUnit : null,
          tags: entry.tags.filter((tag): tag is 'exercise' | 'sick' | 'stress' => tag === 'exercise' || tag === 'sick' || tag === 'stress'),
          doseKind: entry.doseKind === 'meal' || entry.doseKind === 'correction' || entry.doseKind === 'split-upfront' || entry.doseKind === 'split-extended' ? entry.doseKind : null,
        })
        toast.success('Entry updated')
        onOpenChange(false)
      } catch {
        toast.error('Could not update entry')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit recorded data</DialogTitle>
          <DialogDescription>Update the values recorded for this entry.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor={`edit-bg-${entry.id}`}>Blood glucose (mg/dL)</Label><Input id={`edit-bg-${entry.id}`} type="number" min="1" value={bg} onChange={(e) => setBg(e.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor={`edit-units-${entry.id}`}>Insulin units</Label><Input id={`edit-units-${entry.id}`} type="number" min="0" step="0.05" value={units} onChange={(e) => setUnits(e.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor={`edit-carbs-${entry.id}`}>Carbs (g)</Label><Input id={`edit-carbs-${entry.id}`} type="number" min="0" step="0.1" value={carbs} onChange={(e) => setCarbs(e.target.value)} /></div>
          {Number(bg) > 250 && <div className="grid gap-2"><Label htmlFor={`edit-ketones-${entry.id}`}>Ketone level (optional)</Label><Select value={ketones} onValueChange={(value) => value && setKetones(value)}><SelectTrigger id={`edit-ketones-${entry.id}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not checked</SelectItem><SelectItem value="trace">Trace</SelectItem><SelectItem value="small">Small</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="large">Large</SelectItem></SelectContent></Select></div>}
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor={`edit-notes-${entry.id}`}>Notes</Label><Input id={`edit-notes-${entry.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EntryRow({ entry, editable }: { entry: LogEntry; editable: boolean }) {
  const [pending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const status = entry.bgValue !== null ? bgStatus(entry.bgValue) : null
  const Icon = entry.bgValue !== null ? Droplet : entry.insulinUnits !== null ? Syringe : Utensils
  const timing =
    entry.mealRelation === 'during'
      ? 'with meal'
      : entry.mealRelation && entry.mealOffsetValue
        ? `${entry.mealOffsetValue} ${entry.mealOffsetUnit === 'hours' ? 'h' : 'min'} ${entry.mealRelation} meal`
        : entry.mealRelation
          ? `${entry.mealRelation} meal`
          : null

  return (
    <li className="flex items-start gap-4 py-3">
      <time className="w-16 shrink-0 pt-0.5 font-mono text-sm text-muted-foreground" dateTime={new Date(entry.occurredAt).toISOString()}>
        {fmtTime(entry.occurredAt)}
      </time>
      <span
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground',
          status === 'low' && 'bg-destructive text-destructive-foreground',
          (status === 'high' || status === 'very-high') && 'bg-warning/20 text-warning',
          status === 'in-range' && 'bg-primary/15 text-primary',
        )}
        aria-hidden
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {entry.bgValue !== null && (
            <span className="font-mono text-lg">
              {entry.bgValue} <span className="text-xs text-muted-foreground">mg/dL</span>
            </span>
          )}
          {entry.insulinUnits !== null && (
            <span className="font-mono text-lg">
              {fmtUnits(entry.insulinUnits)}{' '}
              <span className="font-sans text-xs text-muted-foreground">{DOSE_LABEL[entry.doseKind ?? ''] ?? 'Insulin'}</span>
            </span>
          )}
          {entry.carbs !== null && (
            <span className="font-mono text-sm text-muted-foreground">
              {Math.round(entry.carbs)} g carbs
              {entry.fat !== null && ` · ${Math.round(entry.fat)} g fat`}
              {entry.protein !== null && ` · ${Math.round(entry.protein)} g protein`}
            </span>
          )}
        </div>
        {(timing || entry.tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {timing && <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">{timing}</span>}
            {entry.tags.map((t) => (
              <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-xs capitalize text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}
        {entry.ketoneLevel && <p className="text-xs font-medium text-warning">Ketones: {entry.ketoneLevel}</p>}
        {entry.mealDescription && <p className="text-pretty text-sm text-muted-foreground">{entry.mealDescription}</p>}
        {entry.notes && <p className="text-pretty text-sm italic text-muted-foreground">{entry.notes}</p>}
        {entry.spoiledInsulin && <p className="text-xs font-semibold text-destructive">Excluded from ICR and ISF calculations: suspected spoiled insulin</p>}
      </div>
      {editable && (
        <div className="flex shrink-0 gap-1 print:hidden">
          <Button variant="ghost" size="icon-sm" aria-label={entry.spoiledInsulin ? 'Include in ratio calculations' : 'Exclude spoiled insulin from ratio calculations'} disabled={pending} onClick={() => { startTransition(async () => { await setSpoiledInsulin(entry.id, !entry.spoiledInsulin); toast.success(entry.spoiledInsulin ? 'Entry included in ratio calculations' : 'Entry excluded from ratio calculations') }) }}>
            <span className="text-[10px] font-bold">{entry.spoiledInsulin ? 'IN' : 'EX'}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit entry"
            disabled={pending}
            onClick={() => setEditOpen(true)}
          >
            <Edit2 className="size-4" aria-hidden />
          </Button>
          <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete entry"
          disabled={pending}
          className="print:hidden"
          onClick={() => {
            if (!confirm('Delete this entry?')) return
            startTransition(async () => {
              await deleteEntry(entry.id)
              toast.success('Entry deleted')
            })
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      )}
      {editable && <EditEntryDialog entry={entry} open={editOpen} onOpenChange={setEditOpen} />}
    </li>
  )
}

export function Timeline({ entries, editable = true, emptyText = 'Nothing logged yet.' }: { entries: LogEntry[]; editable?: boolean; emptyText?: string }) {
  const hydrated = useHydrated()
  if (!hydrated) return <div className="h-32 animate-pulse rounded-lg bg-secondary/50" aria-hidden />
  if (entries.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>

  const sorted = [...entries].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
  const groups: { key: string; label: string; items: LogEntry[] }[] = []
  for (const e of sorted) {
    const key = dayKey(e.occurredAt)
    const last = groups.at(-1)
    if (last?.key === key) last.items.push(e)
    else groups.push({ key, label: fmtDay(e.occurredAt), items: [e] })
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label}>
          <h3 className="sticky top-14 z-10 border-b border-border bg-card py-2 text-sm font-semibold">{g.label}</h3>
          <ul className="divide-y divide-border">
            {g.items.map((e) => (
              <EntryRow key={e.id} entry={e} editable={editable} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
