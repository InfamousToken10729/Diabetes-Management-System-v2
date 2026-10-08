'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { saveProfile, type ProfileInput } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Profile } from '@/lib/db/schema'
import { INSULIN_TYPES } from '@/lib/t1d'
import { AI_PROVIDERS } from '@/lib/ai-providers'

type Field = {
  name: keyof ProfileInput
  label: string
  unit?: string
  step?: string
  hint?: string
  required?: boolean
}

const PERSONAL: Field[] = [
  { name: 'age', label: 'Age', unit: 'years' },
  { name: 'weightKg', label: 'Weight', unit: 'kg', step: '0.1' },
  { name: 'heightCm', label: 'Height', unit: 'cm' },
]

const TARGETS: Field[] = [
  { name: 'targetLow', label: 'Target range low', unit: 'mg/dL', required: true },
  { name: 'targetHigh', label: 'Target range high', unit: 'mg/dL', required: true },
  { name: 'targetBg', label: 'Correction target', unit: 'mg/dL', required: true, hint: 'BG you correct toward' },
]

const RATIOS: Field[] = [
  { name: 'icr', label: 'Insulin-to-carb ratio', unit: 'g / U', step: '0.1', hint: 'Optional — leave blank to learn from your readings' },
  { name: 'isf', label: 'Correction factor (ISF)', unit: 'mg/dL / U', step: '1', hint: 'Optional — leave blank to learn from your readings' },
  { name: 'insulinDurationHours', label: 'Active insulin time', unit: 'hours', step: '0.5', required: true, hint: 'Typically 3–5 h for rapid-acting' },
]

const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other / prefer not to say' },
]

export function ProfileForm({ profile, submitLabel = 'Save settings' }: { profile?: Profile | null; submitLabel?: string }) {
  const [pending, startTransition] = useTransition()
  const [gender, setGender] = useState<string | null>(profile?.gender ?? null)
  const [insulinType, setInsulinType] = useState(profile?.insulinType ?? 'NovoRapid')
  const [aiProvider, setAiProvider] = useState(profile?.aiBaseUrl?.includes('groq') ? 'groq' : profile?.aiBaseUrl?.includes('openrouter') ? 'openrouter' : 'gemini')
  const provider = AI_PROVIDERS[aiProvider as keyof typeof AI_PROVIDERS]
  const initialModelIsManual = Boolean(profile?.aiModel && !provider.models.includes(profile.aiModel))
  const [selectedModel, setSelectedModel] = useState(initialModelIsManual ? '__manual__' : profile?.aiModel ?? provider.models[0])
  const [manualModel, setManualModel] = useState(initialModelIsManual ? profile?.aiModel ?? '' : '')

  const defaults: Record<string, number | null | undefined> = {
    age: profile?.age,
    weightKg: profile?.weightKg,
    heightCm: profile?.heightCm,
    targetLow: profile?.targetLow ?? 70,
    targetHigh: profile?.targetHigh ?? 180,
    targetBg: profile?.targetBg ?? 110,
    icr: profile?.icr,
    isf: profile?.isf,
    insulinDurationHours: profile?.insulinDurationHours ?? 4,
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const num = (k: string) => {
      const v = fd.get(k)
      return v === null || v === '' ? null : Number(v)
    }
    const input: ProfileInput = {
      username: String(fd.get('username') ?? '').trim(),
      glucoseUnit: 'mg/dL',
      age: num('age'),
      weightKg: num('weightKg'),
      heightCm: num('heightCm'),
      gender: (gender as ProfileInput['gender']) ?? null,
      targetLow: num('targetLow') ?? 70,
      targetHigh: num('targetHigh') ?? 180,
      targetBg: num('targetBg') ?? 110,
      icr: num('icr'),
      isf: num('isf'),
      insulinType,
      insulinDurationHours: num('insulinDurationHours') ?? 4,
      aiApiKey: String(fd.get('aiApiKey') ?? '').trim() || null,
      aiModel: String(fd.get('aiModel') ?? '').trim() || null,
      aiBaseUrl: String(fd.get('aiBaseUrl') ?? '').trim() || null,
    }
    startTransition(async () => {
      try {
        await saveProfile(input)
        toast.success('Settings saved')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save settings. Check the values.')
      }
    })
  }

  function saveCurrentForm() {
    const form = document.querySelector('form[data-profile-form]') as HTMLFormElement | null
    form?.requestSubmit()
  }

  const renderField = (f: Field) => (
    <div key={f.name} className="flex flex-col gap-2">
      <Label htmlFor={f.name}>
        {f.label}
        {f.unit && <span className="font-normal text-muted-foreground">({f.unit})</span>}
      </Label>
      <Input
        id={f.name}
        name={f.name}
        type="number"
        inputMode="decimal"
        step={f.step ?? '1'}
        required={f.required}
        defaultValue={defaults[f.name] ?? ''}
        className="font-mono"
      />
      {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
    </div>
  )

  return (
    <form data-profile-form onSubmit={onSubmit} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">About you</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">User name</Label>
            <Input id="username" name="username" defaultValue={profile?.username ?? 'Main account'} placeholder="Your name" required />
            <p className="text-xs text-muted-foreground">Shown in the profile menu.</p>
          </div>

          {PERSONAL.map(renderField)}
          <div className="flex flex-col gap-2">
            <Label htmlFor="gender">Gender</Label>
            <Select items={GENDERS} value={gender} onValueChange={(v) => setGender(v as string | null)}>
              <SelectTrigger id="gender" className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Glucose targets</legend>
        <div className="grid gap-4 sm:grid-cols-3">{TARGETS.map(renderField)}</div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Insulin</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="insulinType">Rapid-acting insulin</Label>
            <Select
              items={INSULIN_TYPES.map((t) => ({ value: t.id, label: t.id }))}
              value={insulinType}
              onValueChange={(v) => v && setInsulinType(v as string)}
            >
              <SelectTrigger id="insulinType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSULIN_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Sets the insulin action peak</p>
          </div>
          {RATIOS.map(renderField)}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-border/70 bg-muted/20 p-4">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Meal AI provider</legend>
        <p className="text-xs text-muted-foreground">Required for meal estimation. Choose a provider, enter only its API key, and select a model. Nothing is sent until a key is saved.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="aiProvider">AI provider</Label>
            <Select items={Object.entries(AI_PROVIDERS).map(([value, item]) => ({ value, label: item.label }))} value={aiProvider} onValueChange={(value) => { if (value) { setAiProvider(value); setSelectedModel(AI_PROVIDERS[value as keyof typeof AI_PROVIDERS].models[0]); setManualModel('') } }}>
              <SelectTrigger id="aiProvider"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(AI_PROVIDERS).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="aiApiKey">API key</Label>
            <Input id="aiApiKey" name="aiApiKey" type="password" autoComplete="off" defaultValue={profile?.aiApiKey ?? ''} placeholder="Paste provider API key" />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="aiModel">Model</Label>
            <Select items={[...provider.models.map((value) => ({ value, label: value })), { value: '__manual__', label: 'Enter model manually' }]} value={selectedModel} onValueChange={(value) => { if (value) { setSelectedModel(value); if (value !== '__manual__') setManualModel('') } }}>
              <SelectTrigger id="aiModel"><SelectValue /></SelectTrigger>
              <SelectContent>{provider.models.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}<SelectItem value="__manual__">Enter model manually</SelectItem></SelectContent>
            </Select>
            {selectedModel === '__manual__' && <Input name="aiModel" value={manualModel} onChange={(event) => setManualModel(event.target.value)} placeholder="Custom model ID (only if manual)" aria-label="Custom model ID" />}
            {selectedModel !== '__manual__' && <input type="hidden" name="aiModel" value={selectedModel} readOnly />}
            <input type="hidden" name="aiBaseUrl" value={provider.baseUrl} readOnly />
            <p className="text-xs text-muted-foreground">Developer-maintained model lists live in <code>lib/ai-providers.ts</code>. Use manual entry for paid, new, or renamed models.</p>
          </div>
        </div>
      </fieldset>
      <div className="flex justify-end"><Button type="button" variant="outline" onClick={saveCurrentForm} disabled={pending}>Save Meal AI provider</Button></div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={saveCurrentForm} disabled={pending}>Save About you, glucose targets & insulin</Button>
      </div>
    </form>
  )
}
