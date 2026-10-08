'use client'

import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** `null` means "now". Otherwise a backdated timestamp. */
export function WhenPicker({ value, onChange }: { value: Date | null; onChange: (d: Date | null) => void }) {
  const [day, setDay] = useState<Date>(() => value ?? new Date())
  const [time, setTime] = useState(() => {
    const d = value ?? new Date()
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  function commit(nextDay: Date, nextTime: string) {
    const [h, m] = nextTime.split(':').map(Number)
    const d = new Date(nextDay)
    d.setHours(h || 0, m || 0, 0, 0)
    onChange(d)
  }

  const isNow = value === null

  return (
    <div className="flex flex-col gap-2">
      <Label>When</Label>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Entry time">
        <Button type="button" size="sm" variant={isNow ? 'default' : 'outline'} aria-pressed={isNow} onClick={() => onChange(null)}>
          Now
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!isNow ? 'default' : 'outline'}
          aria-pressed={!isNow}
          onClick={() => commit(day, time)}
        >
          Earlier
        </Button>
        {!isNow && (
          <>
            <Popover>
              <PopoverTrigger
                render={
                  <Button type="button" variant="outline" size="sm" className="font-mono">
                    <CalendarIcon className="size-4" aria-hidden />
                    {day.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={day}
                  disabled={{ after: new Date() }}
                  onSelect={(d) => {
                    if (!d) return
                    setDay(d)
                    commit(d, time)
                  }}
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              aria-label="Time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value)
                commit(day, e.target.value)
              }}
              className={cn('h-8 w-28 font-mono')}
            />
          </>
        )}
      </div>
    </div>
  )
}
