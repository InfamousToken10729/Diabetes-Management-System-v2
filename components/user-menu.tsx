'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Activity, ChevronDown, CircleHelp, History, LogOut, Settings2, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { changeMainPassword, signOutDeviceUser } from '@/lib/user-actions'

export function UserMenu({ activeUser, users }: { activeUser: { id: string; displayName: string; isMain: boolean }; users: Array<{ id: string; displayName: string; isMain: boolean }> }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const initials = activeUser.displayName.slice(0, 1).toUpperCase()
  function signOut() { startTransition(async () => { await signOutDeviceUser(); window.location.href = '/login' }) }
  return <div className="relative">
    <Button variant="ghost" size="sm" className="gap-2 rounded-full" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Open user menu">
      <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">{initials}</span><span className="hidden max-w-28 truncate sm:inline">{activeUser.displayName}</span><ChevronDown className="size-4" />
    </Button>
    {open && <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-border bg-popover p-2 shadow-xl">
      <div className="border-b border-border px-3 pb-3 pt-2"><p className="font-semibold">{activeUser.displayName}</p><p className="text-xs text-muted-foreground">{activeUser.isMain ? 'Main account' : 'Family profile'}</p></div>
      <div className="grid gap-1 py-2">
        <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"><Activity className="size-4" />Dashboard</Link>
        <Link href="/meal" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"><Utensils className="size-4" />Meal & Dose</Link>
        <Link href="/history" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"><History className="size-4" />History</Link>
        <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"><Settings2 className="size-4" />Settings</Link>
        <Link href="/help" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"><CircleHelp className="size-4" />Help</Link>
      </div>
      <button onClick={signOut} disabled={pending} className="mt-2 flex w-full items-center gap-3 border-t border-border px-3 pt-3 text-sm text-muted-foreground hover:text-foreground"><LogOut className="size-4" />Sign Out</button>
    </div>}
  </div>
}

export function PasswordForm() {
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  function submit(data: FormData) { const oldPassword = String(data.get('oldPassword') || ''); const next = String(data.get('newPassword') || ''); const confirm = String(data.get('confirmPassword') || ''); if (next !== confirm) { setMessage('New passwords do not match'); return } startTransition(async () => { try { await changeMainPassword(oldPassword, next); setMessage('Password changed successfully') } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not change password') } }) }
  return <form action={submit} className="grid max-w-md gap-3"><input name="oldPassword" type="password" required placeholder="Old password" className="h-10 rounded-md border border-input bg-background px-3 text-sm" /><input name="newPassword" type="password" required minLength={8} placeholder="New password" className="h-10 rounded-md border border-input bg-background px-3 text-sm" /><input name="confirmPassword" type="password" required minLength={8} placeholder="Repeat new password" className="h-10 rounded-md border border-input bg-background px-3 text-sm" /><Button disabled={pending} type="submit">{pending ? 'Changing…' : 'Change Password'}</Button>{message && <p className="text-sm text-muted-foreground">{message}</p>}</form>
}

export function UserMenuButton({ activeUser, users }: { activeUser: { id: string; displayName: string; isMain: boolean }; users: Array<{ id: string; displayName: string; isMain: boolean }> }) { return <UserMenu activeUser={activeUser} users={users} /> }
