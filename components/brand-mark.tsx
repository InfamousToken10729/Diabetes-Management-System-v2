import { Activity, Droplets } from 'lucide-react'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-primary to-blue-700 text-primary-foreground shadow-[0_0_18px_-4px_hsl(var(--primary))] ${compact ? 'size-8' : 'size-14'}`}>
      <Droplets className={compact ? 'size-[18px] fill-current stroke-[1.5]' : 'size-7 fill-current stroke-[1.5]'} />
      <Activity className={`absolute bottom-1 right-1 ${compact ? 'size-3' : 'size-5'} rounded-full bg-blue-900/70 p-0.5`} />
    </span>
  )
}
