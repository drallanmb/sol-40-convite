import { useSyncExternalStore } from 'react'
import { getEventState } from '../lib/countdown'

/**
 * Module-level shared tick source (WR-01). `Countdown.tsx` and
 * `CountdownRail.tsx` both call `useCountdown()` — previously each call site
 * owned its own `useState` + `setInterval`, so the two components ticked on
 * independently-scheduled 1000ms timers that were never in lockstep,
 * letting the `seconds` (and momentarily `minutes`) digit disagree by up to
 * ~1s at the same wall-clock instant, contradicting `CountdownRail`'s own
 * doc comment. Hoisting the interval + state to module scope and reading it
 * through `useSyncExternalStore` means there is exactly ONE timer for the
 * whole app: every subscriber re-renders from the same `state` reference on
 * the same tick, so the two renderers can never disagree.
 */
let tickState = getEventState(new Date())
let intervalId: number | undefined
const listeners = new Set<() => void>()

function ensureTicking() {
  if (intervalId !== undefined) return
  intervalId = window.setInterval(() => {
    tickState = getEventState(new Date())
    listeners.forEach((listener) => listener())
  }, 1000)
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  ensureTicking()
  return () => {
    listeners.delete(onStoreChange)
    // No more subscribers on the page: stop the timer instead of ticking
    // forever in the background (e.g. between route changes / in tests).
    if (listeners.size === 0 && intervalId !== undefined) {
      window.clearInterval(intervalId)
      intervalId = undefined
    }
  }
}

function getSnapshot() {
  return tickState
}

/**
 * Reads the single shared countdown tick (see module doc comment above).
 * Owns scheduling only — no date math lives here, all of it is in
 * `getEventState`. The snapshot is seeded at module load so the very first
 * paint already shows correct digits (there is no skeleton/loading state
 * for the countdown).
 */
export function useCountdown() {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export default useCountdown
