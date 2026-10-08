import { UserPicker } from '@/components/user-picker'
import { listDeviceUsers, isDeviceSignedOut } from '@/lib/user-actions'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const [users, signedOut] = await Promise.all([listDeviceUsers(), isDeviceSignedOut()])
  return <UserPicker users={users} signedOut={signedOut || users.length > 0} />
}
