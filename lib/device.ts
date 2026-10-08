import 'server-only'
import { cookies } from 'next/headers'
import { DEVICE_COOKIE } from './device-cookie'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getDeviceId() {
  const id = (await cookies()).get(DEVICE_COOKIE)?.value
  if (!id || !UUID_RE.test(id)) throw new Error('Missing device identifier')
  return id
}
