import { NextResponse, type NextRequest } from 'next/server'
import { DEVICE_COOKIE } from '@/lib/device-cookie'

export function proxy(request: NextRequest) {
  if (request.cookies.get(DEVICE_COOKIE)?.value) return NextResponse.next()

  const deviceId = crypto.randomUUID()
  // Make the new id visible to this same request's server components and actions.
  request.cookies.set(DEVICE_COOKIE, deviceId)
  const response = NextResponse.next({ request: { headers: request.headers } })
  response.cookies.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 60 * 24 * 365 * 5,
  })
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|ico)$).*)'],
}
