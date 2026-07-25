import { useMemo, useSyncExternalStore } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type MotionChangeListener = () => void

export type ReducedMotionMediaQuery = {
  readonly matches: boolean
  addEventListener?: (
    type: 'change',
    listener: MotionChangeListener,
  ) => void
  removeEventListener?: (
    type: 'change',
    listener: MotionChangeListener,
  ) => void
  addListener?: (listener: MotionChangeListener) => void
  removeListener?: (listener: MotionChangeListener) => void
}

type MediaQueryResolver = () => ReducedMotionMediaQuery | undefined

function resolveBrowserQuery(): ReducedMotionMediaQuery | undefined {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return undefined
  }
  return window.matchMedia(REDUCED_MOTION_QUERY)
}

export function createReducedMotionStore(
  resolveQuery: MediaQueryResolver = resolveBrowserQuery,
) {
  let didResolve = false
  let query: ReducedMotionMediaQuery | undefined

  function getQuery() {
    if (!didResolve) {
      query = resolveQuery()
      didResolve = true
    }
    return query
  }

  return {
    getSnapshot: () => getQuery()?.matches ?? false,
    getServerSnapshot: () => false,
    subscribe(onStoreChange: MotionChangeListener) {
      const mediaQuery = getQuery()
      if (!mediaQuery) return () => undefined

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', onStoreChange)
        return () =>
          mediaQuery.removeEventListener?.('change', onStoreChange)
      }

      mediaQuery.addListener?.(onStoreChange)
      return () => mediaQuery.removeListener?.(onStoreChange)
    },
  }
}

export function useReducedMotion() {
  const store = useMemo(() => createReducedMotionStore(), [])
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )
}

export default useReducedMotion
