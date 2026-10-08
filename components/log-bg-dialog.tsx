'use client'

import { Droplet } from 'lucide-react'
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
import { HYPER_THRESHOLD, HYPO_THRESHOLD, type ContextTag } from '@/lib/t1d'
import { toMgDl, type GlucoseUnit } from '@/lib/glucose-units'
import { TagPicker } from './tag-picker'
import { WhenPicker } from './when-picker'

export function LogBgDialog({ trigger, unit = 'mg/dL' }: { trigger?: React.ReactElement; unit?: GlucoseUnit }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [when, setWhen] = useState<Date | null>(null)
  const [tags, setTags] = useState<ContextTag[]>([])
  const [notes, setNotes] = useState('')
  const [ketoneLevel, setKetoneLevel] = useState('')
  const [pending, startTransition] = useTransition()

  function reset() {
    setValue('')
    setWhen(null)
    setTags([])
    setNotes('')
    setKetoneLevel('')
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const entered = Number(value)
    const bg = Math.round(toMgDl(entered, unit))
    if (!Number.isFinite(entered) || bg < 20 || bg > 600) {
      toast.error(`Enter a glucose value between ${unit === 'mmol/L' ? '1.1 and 33.3 mmol/L' : '20 and 600 mg/dL'}`)
      return
    }
    startTransition(async () => {
      try {
        await addEntry({ occurredAt: when ?? new Date(), bgValue: bg, ketoneLevel: bg > HYPER_THRESHOLD ? ((ketoneLevel || null) as 'none' | 'trace' | 'small' | 'moderate' | 'large' | null) : null, tags, notes: notes.trim() || null })
        setOpen(false)
        reset()
        if (bg < HYPO_THRESHOLD) toast.error(`Low: ${bg} mg/dL — rescue protocol started`)
        else if (bg > HYPER_THRESHOLD) toast.warning(`High: ${bg} mg/dL — check ketones before correcting`)
        else toast.success(`Logged ${bg} mg/dL`)
      } catch {
        toast.error('Could not save this reading')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="lg">
              <Droplet className="size-4" aria-hidden />
              Log glucose
            </Button>
          )
        }
      />
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Log blood glucose</DialogTitle>
            <DialogDescription>Finger-stick or CGM reading in mg/dL.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bg-value">Reading ({unit})</Label>
            <Input
              id="bg-value"
              type="number"
              inputMode="numeric"
              min={unit === 'mmol/L' ? 1.1 : 20}
              max={unit === 'mmol/L' ? 33.3 : 600}
              required
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-14 font-mono text-3xl"
            />
          </div>
          <WhenPicker value={when} onChange={setWhen} />
          {Number(value) > HYPER_THRESHOLD && (
            <div className="flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <Label htmlFor="bg-ketones">Ketone level (optional)</Label>
              <select id="bg-ketones" value={ketoneLevel} onChange={(e) => setKetoneLevel(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Not checked</option>
                <option value="none">None</option><option value="trace">Trace</option><option value="small">Small</option><option value="moderate">Moderate</option><option value="large">Large</option>
              </select>
              <p className="text-xs text-muted-foreground">Check ketones and follow your sick-day plan for high readings.</p>
            </div>
          )}
          <TagPicker value={tags} onChange={setTags} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="bg-notes">Notes</Label>
            <Textarea id="bg-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save reading'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
