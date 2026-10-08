'use client'

import { Activity, History, Settings2, Utensils } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/user-menu'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Activity },
  { href: '/meal', label: 'Meal & dose', icon: Utensils },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings2 },
]

export function AppHeader({ activeUser, users }: { activeUser: { id: string; displayName: string; isMain: boolean }; users: Array<{ id: string; displayName: string; isMain: boolean }> }) {
  const pathname = usePathname()
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
<BrandMark compact />
            <span className="font-semibold tracking-tight">GlycoGuide</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">T1D assistant</span>
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
                        active && 'bg-secondary text-foreground',
                      )}
                    >
                      <item.icon className="size-4" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
              </nav>
          <UserMenu activeUser={activeUser} users={users} />
        </div>
      </header>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden print:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 text-xs text-muted-foreground',
                    active && 'text-primary',
                  )}
                >
                  <item.icon className="size-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
