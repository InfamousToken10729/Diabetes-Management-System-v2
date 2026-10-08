'use client'

import { Label } from '@/components/ui/label'
import { CONTEXT_TAGS, type ContextTag } from '@/lib/t1d'
import { cn } from '@/lib/utils'

export function TagPicker({
  value,
  onChange,
  showHints = false,
}: {
  value: ContextTag[]
  onChange: (tags: ContextTag[]) => void
  showHints?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Context</Label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Context tags">
        {CONTEXT_TAGS.map((tag) => {
          const active = value.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? value.filter((t) => t !== tag.id) : [...value, tag.id])}
              className={cn(
                'rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
                active && 'border-primary bg-primary/15 text-foreground',
              )}
            >
              {tag.label}
              {showHints && <span className="ml-1.5 font-mono text-xs text-muted-foreground">{tag.hint}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
