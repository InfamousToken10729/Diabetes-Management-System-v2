'use client'

import { Camera, ImagePlus, Loader2, Sparkles, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Macros } from '@/lib/t1d'

type Analysis = {
  items: { name: string; estimatedGrams: number; carbs: number; protein: number; fat: number; sugar: number }[]
  totals: Macros
  confidence: 'low' | 'medium' | 'high'
  notes: string
}

async function resizeImage(file: File, max = 1024): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    await img.decode()
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

const MACRO_FIELDS: { key: keyof Macros; label: string }[] = [
  { key: 'carbs', label: 'Carbs' },
  { key: 'protein', label: 'Protein' },
  { key: 'fat', label: 'Fat' },
  { key: 'sugar', label: 'Sugar' },
]

export function MealAnalyzer({
  description,
  onDescriptionChange,
  macros,
  onMacrosChange,
}: {
  description: string
  onDescriptionChange: (v: string) => void
  macros: Record<keyof Macros, string>
  onMacrosChange: (m: Record<keyof Macros, string>) => void
}) {
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [photoChooserOpen, setPhotoChooserOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    try {
      setImage(await resizeImage(file))
    } catch {
      toast.error('Could not read that image')
    }
  }

  async function analyze() {
    if (!description.trim() && !image) {
      toast.error('Add a photo or describe the meal first')
      return
    }
    setLoading(true)
    setAnalysisError(null)
    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, image }),
      })
      const data = await res.json()
      if (!res.ok) {
        const code = data.errorCode ?? `HTTP_${res.status}`
        throw new Error(`${data.error ?? 'Analysis failed'} (error code: ${code})`)
      }
      setAnalysis(data)
      onMacrosChange({
        carbs: String(Math.round(data.totals.carbs)),
        protein: String(Math.round(data.totals.protein)),
        fat: String(Math.round(data.totals.fat)),
        sugar: String(Math.round(data.totals.sugar)),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed (error code: UNKNOWN)'
      setAnalysisError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section aria-labelledby="analyzer-title" className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="analyzer-title" className="text-lg font-semibold">
          1 · What are you eating?
        </h2>
        <p className="text-sm text-muted-foreground">
          Snap a photo and add details like weights (e.g. &quot;200 g cooked rice&quot;) for a better estimate.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {image ? (
          <div className="relative overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
            <img src={image} alt="Meal to analyze" className="max-h-72 w-full object-cover" />
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="absolute right-2 top-2"
              aria-label="Remove photo"
              onClick={() => {
                setImage(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPhotoChooserOpen(true)}
            className="flex h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Camera className="size-6" aria-hidden />
            Take or upload a meal photo
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="sr-only" aria-label="Choose meal photo from gallery" />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" aria-label="Take meal photo with camera" />
        <Dialog open={photoChooserOpen} onOpenChange={setPhotoChooserOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add a meal photo</DialogTitle><DialogDescription>Choose a photo from your gallery or open the camera.</DialogDescription></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => { setPhotoChooserOpen(false); fileRef.current?.click() }}><ImagePlus className="mr-2 size-4" />Choose from gallery</Button>
              <Button type="button" onClick={() => { setPhotoChooserOpen(false); cameraRef.current?.click() }}><Camera className="mr-2 size-4" />Open camera</Button>
            </div>
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setPhotoChooserOpen(false)}>Cancel</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <Label htmlFor="meal-desc" className="sr-only">
          Meal description
        </Label>
        <Textarea
          id="meal-desc"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="e.g. 2 slices pepperoni pizza, medium, plus a diet coke"
          rows={3}
          maxLength={2000}
        />
        <Button type="button" onClick={analyze} disabled={loading} className="self-start">
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
          {loading ? 'Analyzing…' : 'Estimate macros'}
        </Button>
      </div>

      {analysisError && (
        <div role="alert" className="flex flex-col gap-1 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p className="font-medium text-destructive">Macro estimate failed</p>
          <p className="text-muted-foreground">{analysisError}</p>
          <p className="text-xs text-muted-foreground">Codes such as HTTP_429 usually indicate a usage limit; HTTP_5xx usually indicates a service-side failure.</p>
        </div>
      )}

      {analysis && (
        <div className="flex flex-col gap-2 rounded-lg bg-secondary p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Identified items</p>
            <span className="text-xs capitalize text-muted-foreground">{analysis.confidence} confidence</span>
          </div>
          <ul className="flex flex-col gap-1 text-sm">
            {analysis.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>
                  {it.name} <span className="text-muted-foreground">~{Math.round(it.estimatedGrams)} g</span>
                </span>
                <span className="shrink-0 text-right font-mono text-xs text-muted-foreground">
                  {Math.round(it.carbs)} g C · {Math.round(it.sugar)} g sugar · {Math.round(it.protein)} g P · {Math.round(it.fat)} g F
                </span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs sm:grid-cols-4">
            <span>Carbs <strong className="font-mono">{Math.round(analysis.totals.carbs)} g</strong></span>
            <span>Sugar <strong className="font-mono">{Math.round(analysis.totals.sugar)} g</strong></span>
            <span>Protein <strong className="font-mono">{Math.round(analysis.totals.protein)} g</strong></span>
            <span>Fat <strong className="font-mono">{Math.round(analysis.totals.fat)} g</strong></span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{analysis.notes} Sugar is included within total carbs and is shown separately for context.</p>
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Macros (grams) — edit if you know better</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MACRO_FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`macro-${f.key}`} className="text-xs text-muted-foreground">
                {f.label}
              </Label>
              <Input
                id={`macro-${f.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={macros[f.key]}
                onChange={(e) => onMacrosChange({ ...macros, [f.key]: e.target.value })}
                className="font-mono"
              />
            </div>
          ))}
        </div>
      </fieldset>
    </section>
  )
}
