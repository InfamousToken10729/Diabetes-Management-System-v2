'use client'

import { useState, useTransition } from 'react'
import { createDeviceUser, loginMainAccount, selectDeviceUser } from '@/lib/user-actions'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function UserPicker({ users, signedOut = false }: { users: Array<{ id: string; displayName: string; isMain: boolean }>; signedOut?: boolean }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [recovery, setRecovery] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [pending, startTransition] = useTransition()
  const firstUser = users.length === 0

  function choose(id: string) {
    startTransition(async () => {
      try {
        await selectDeviceUser(id)
        window.location.href = `/dashboard?activeUser=${encodeURIComponent(id)}&session=${Date.now()}`
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'Could not switch user')
      }
    })
  }

  function login() {
    startTransition(async () => {
      try { await loginMainAccount(loginPassword); window.location.href = `/dashboard?signedIn=1&session=${Date.now()}` }
      catch (error) { window.alert(error instanceof Error ? error.message : 'Could not sign in') }
    })
  }

  function create() {
    startTransition(async () => {
      try { await createDeviceUser(name, firstUser ? password : undefined, firstUser ? recovery : undefined); window.location.reload() }
      catch (error) { window.alert(error instanceof Error ? error.message : 'Could not create user') }
    })
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 text-center"><BrandMark /><h1 className="text-2xl font-semibold">Who is using GlycoGuide?</h1><p className="mt-1 text-sm text-muted-foreground">Set up or sign in to your main account.</p></div>
{signedOut ? <div className="mb-6 grid gap-3 rounded-xl border border-border bg-background/50 p-4"><div><p className="font-medium">Sign in to GlycoGuide</p><p className="text-sm text-muted-foreground">Enter the main account password to continue.</p></div><Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Main account password" onKeyDown={(e) => { if (e.key === 'Enter') login() }} /><Button onClick={login} disabled={pending || !loginPassword}>{pending ? 'Signing in…' : 'Sign in'}</Button></div> : null}
        {firstUser && <><Button variant="secondary" className="w-full" onClick={() => setCreating((value) => !value)}>{creating ? 'Cancel' : 'Create main account'}</Button>{creating && <div className="mt-4 grid gap-3 border-t border-border pt-4"><div className="grid gap-1.5"><Label htmlFor="new-user-name">Main account name</Label><Input id="new-user-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" /></div><div className="grid gap-1.5"><Label htmlFor="main-password">Main account password</Label><Input id="main-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} /></div><div className="grid gap-1.5"><Label htmlFor="recovery-phrase">Recovery phrase</Label><Input id="recovery-phrase" value={recovery} onChange={(e) => setRecovery(e.target.value)} /><p className="text-xs text-muted-foreground">Keep this phrase somewhere safe to recover your password.</p></div><Button onClick={create} disabled={pending || !name.trim()}>{pending ? 'Creating…' : 'Create main account'}</Button></div>}</>}
      </section>
    </main>
  )
}
