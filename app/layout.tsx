import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { headers } from 'next/headers'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import { AppHeader } from '@/components/app-header'
import { HypoRescue } from '@/components/hypo-rescue'
import { Onboarding } from '@/components/onboarding'
import { ReminderWatcher } from '@/components/reminder-watcher'
import { Toaster } from '@/components/ui/sonner'
import { UserPicker } from '@/components/user-picker'
import { getLatestBg, getPendingReminders, getProfile } from '@/lib/data'
import { getActiveDeviceUser, isDeviceSignedOut, listDeviceUsers } from '@/lib/user-actions'
import { HYPO_THRESHOLD, RESCUE_WINDOW_HOURS } from '@/lib/t1d'
import './globals.css'

const plexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-plex-sans' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-mono' })

export const metadata: Metadata = {
  title: 'GlycoGuide — Type 1 Diabetes Management Assistant',
  description:
    'Log glucose, insulin and meals, estimate carbs from a photo, get insulin-on-board-aware dose suggestions and track time in range. No account needed.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/glycoguide-mark.svg', type: 'image/svg+xml' },
    ],
    apple: '/glycoguide-mark.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#1b2230',
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  noStore()
  const requestHeaders = await headers()
  const pathname = requestHeaders.get('x-next-url') ?? requestHeaders.get('x-invoke-path') ?? requestHeaders.get('x-matched-path') ?? ''
  const [profile, latestBg, pending, users, activeUser, signedOut] = await Promise.all([getProfile(), getLatestBg(), getPendingReminders(), listDeviceUsers(), getActiveDeviceUser(), isDeviceSignedOut()])

  const rescueActive =
    !!latestBg &&
    latestBg.bgValue !== null &&
    latestBg.bgValue < HYPO_THRESHOLD &&
    // eslint-disable-next-line react-hooks/purity -- request-time check on the server
    Date.now() - new Date(latestBg.createdAt).getTime() < RESCUE_WINDOW_HOURS * 3600000

  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} bg-background`}>
      <body className="min-h-dvh font-sans antialiased">
        {pathname === '/login' ? (
          children
        ) : !activeUser ? (
          <UserPicker users={users} signedOut={signedOut} />
        ) : profile ? (
          <>
            {activeUser && <AppHeader activeUser={{ ...activeUser, displayName: profile.username ?? activeUser.displayName }} users={[{ ...activeUser, displayName: profile.username ?? activeUser.displayName }]} />}
            <ReminderWatcher
              reminders={pending.map((r) => ({
                id: r.id,
                dueAt: r.dueAt.toISOString(),
                title: r.title,
                units: r.units,
              }))}
            />
            <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">{children}</main>
            {rescueActive && latestBg && (
              <HypoRescue value={latestBg.bgValue as number} loggedAt={latestBg.createdAt.toISOString()} />
            )}
          </>
        ) : (
          <Onboarding />
        )}
        <Toaster position="top-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
