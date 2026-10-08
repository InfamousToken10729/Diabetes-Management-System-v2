import { ReportView } from '@/components/report-view'
import { getEntriesSince, getProfile } from '@/lib/data'

export const metadata = { title: 'Doctor report — GlycoGuide' }

export default async function ReportPage() {
  const profile = await getProfile()
  if (!profile) return null
  const entries = await getEntriesSince(14)
  return <ReportView profile={profile} entries={entries} />
}
