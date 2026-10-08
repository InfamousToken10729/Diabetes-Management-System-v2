import { Download, FileText } from 'lucide-react'
import { HistoryRange } from '@/components/history-range'
import Link from 'next/link'
import { Timeline } from '@/components/timeline'
import { Button } from '@/components/ui/button'
import { getEntriesSince, getProfile } from '@/lib/data'

export default async function HistoryPage() {
  const profile = await getProfile()
  if (!profile) return null
  const entries = await getEntriesSince(90)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="text-sm text-muted-foreground">Last 90 days, newest first. {entries.length} entries.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<a href="/api/export" download />} nativeButton={false}>
            <Download className="size-4" aria-hidden />
            Export CSV
          </Button>
          <Button render={<Link href="/report" />} nativeButton={false}>
            <FileText className="size-4" aria-hidden />
            Doctor report (PDF)
          </Button>
        </div>
      </div>
      <HistoryRange entries={entries} />
    </div>
  )
}
