import { UserPicker } from '@/components/user-picker'
import { listDeviceUsers } from '@/lib/user-actions'

export default async function NewUserPage() {
  const users = await listDeviceUsers()
  return <UserPicker users={users} />
}
