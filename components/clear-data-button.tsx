'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { clearAllData } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function ClearDataButton() {
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function clear() {
    startTransition(async () => {
      try {
        await clearAllData()
        setOpen(false)
        toast.success('All data cleared')
        window.location.href = '/login'
      } catch {
        toast.error('Could not clear your data')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" />}>Clear all data</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear all data?</DialogTitle>
          <DialogDescription>This permanently deletes your profile, glucose readings, insulin logs, meals, and reminders from this device. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="button" variant="destructive" onClick={clear} disabled={pending}>{pending ? 'Clearing…' : 'Yes, clear everything'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
