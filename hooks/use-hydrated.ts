'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/** True only on the client, so local-timezone formatting never mismatches the server render. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}

export function useNow(intervalMs = 30000) {
  return useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, intervalMs)
      return () => clearInterval(id)
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  )
}
