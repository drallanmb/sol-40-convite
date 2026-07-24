import { useEffect, useState } from 'react'
import { getEventState } from '../lib/countdown'

/**
 * Ticks the countdown state once per second.
 *
 * Owns scheduling only — no date math lives here, all of it is in
 * `getEventState`. State is seeded via a lazy initializer so the very first
 * paint already shows correct digits (there is no skeleton/loading state
 * for the countdown). The `clearInterval` cleanup is returned from the same
 * effect that schedules the 1000ms timer: React 19 StrictMode double-invokes
 * effects in development, and a missing cleanup would stack two timers,
 * visibly doubling the tick rate.
 */
export function useCountdown() {
  const [state, setState] = useState(() => getEventState(new Date()))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState(getEventState(new Date()))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  return state
}

export default useCountdown
